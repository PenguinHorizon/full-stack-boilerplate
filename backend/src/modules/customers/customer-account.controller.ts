import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { MessageResponse } from '@contracts/identity.contracts';
import {
  CustomerProfileResponse,
  CustomerSessionResponse,
} from '@contracts/customers.contracts';
import { Customer } from '@database/entities/customers/customer.entity';
import { PublicOrganizationRecord } from '@modules/organizations/organizations.mapper';
import { OrganizationsService } from '@modules/organizations/organizations.service';
import { CustomerAccountService, toProfile } from './customer-account.service';
import {
  CurrentCustomer,
  CustomerAuthGuard,
  CustomerSession,
} from './customer-auth.guard';
import {
  CUSTOMER_REFRESH_COOKIE,
  CustomerTokenService,
} from './customer-token.service';
import {
  ChangeCustomerPasswordDto,
  CustomerForgotPasswordDto,
  CustomerResetPasswordDto,
  LoginCustomerDto,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './customers.dto';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Storefront customer accounts (`/storefront/:slug`). Every
 * route is `@Public()` for the staff guard; `/me…` routes add the customer
 * guard instead.
 */
@Public()
@ApiTags('Storefront - Customers')
@Controller('storefront/:slug')
export class CustomerAccountController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly accounts: CustomerAccountService,
    private readonly tokens: CustomerTokenService,
  ) {}

  /* ── Sessions ────────────────────────────────────────────────────── */

  @Post('auth/register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Create an account (claims a guest record with the same phone)',
  })
  @ApiOkResponse({ type: CustomerSessionResponse })
  async register(
    @Param('slug') slug: string,
    @Body() dto: RegisterCustomerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerSessionResponse> {
    const organization = await this.organizations.findPublicBySlug(slug);
    const customer = await this.accounts.register(organization, dto);
    return this.startSession(organization, customer, req, res);
  }

  @Post('auth/login')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CustomerSessionResponse })
  async login(
    @Param('slug') slug: string,
    @Body() dto: LoginCustomerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerSessionResponse> {
    const organization = await this.organizations.findPublicBySlug(slug);
    const customer = await this.accounts.login(organization, dto);
    return this.startSession(organization, customer, req, res);
  }

  @Post('auth/refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh cookie (path-scoped to this organization)',
  })
  @ApiOkResponse({ type: CustomerSessionResponse })
  async refresh(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerSessionResponse> {
    const organization = await this.organizations.findPublicBySlug(slug);
    const presented = req.cookies?.[CUSTOMER_REFRESH_COOKIE] as string | undefined;
    if (!presented) throw new UnauthorizedException('Not signed in');
    const session = await this.tokens.rotate(
      presented,
      organization.id,
      this.context(req),
    );
    res.cookie(
      CUSTOMER_REFRESH_COOKIE,
      session.refreshToken,
      this.tokens.cookieOptions(slug),
    );
    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      customer: toProfile(session.customer),
    };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async logout(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    const presented = req.cookies?.[CUSTOMER_REFRESH_COOKIE] as string | undefined;
    if (presented) await this.tokens.revokeByToken(presented);
    res.clearCookie(CUSTOMER_REFRESH_COOKIE, {
      ...this.tokens.cookieOptions(slug),
      maxAge: undefined,
    });
    return { message: 'Signed out' };
  }

  @Post('auth/forgot-password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Email a reset link (same answer whether or not the email exists)',
  })
  @ApiOkResponse({ type: MessageResponse })
  async forgotPassword(
    @Param('slug') slug: string,
    @Body() dto: CustomerForgotPasswordDto,
    @Req() req: Request,
  ): Promise<MessageResponse> {
    const organization = await this.organizations.findPublicBySlug(slug);
    const origin = await this.organizations.storefrontOrigin(
      organization,
      req.get('origin'),
    );
    await this.accounts.forgotPassword(organization, dto.email, origin);
    return {
      message:
        'If an account uses that email, we’ve sent a link to reset the password.',
    };
  }

  @Post('auth/reset-password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CustomerSessionResponse })
  async resetPassword(
    @Param('slug') slug: string,
    @Body() dto: CustomerResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerSessionResponse> {
    const organization = await this.organizations.findPublicBySlug(slug);
    const customer = await this.accounts.resetPassword(
      organization,
      dto.token,
      dto.password,
    );
    await this.tokens.revokeAll(customer.id);
    return this.startSession(organization, customer, req, res);
  }

  /* ── Profile ─────────────────────────────────────────────────────── */

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CustomerProfileResponse })
  me(@CurrentCustomer() session: CustomerSession): CustomerProfileResponse {
    return toProfile(session.customer);
  }

  @Patch('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CustomerProfileResponse })
  async updateMe(
    @CurrentCustomer() session: CustomerSession,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileResponse> {
    return toProfile(await this.accounts.updateProfile(session.customer, dto));
  }

  @Put('me/password')
  @UseGuards(CustomerAuthGuard)
  @Throttle(AUTH_THROTTLE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password; signs out other devices' })
  @ApiOkResponse({ type: CustomerSessionResponse })
  async changePassword(
    @CurrentCustomer() session: CustomerSession,
    @Body() dto: ChangeCustomerPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerSessionResponse> {
    await this.accounts.changePassword(session.customer, dto);
    await this.tokens.revokeAll(session.customer.id);
    return this.startSession(session.organization, session.customer, req, res);
  }

  private context(req: Request) {
    return { userAgent: req.get('user-agent'), ip: req.ip };
  }

  private async startSession(
    organization: PublicOrganizationRecord,
    customer: Customer,
    req: Request,
    res: Response,
  ): Promise<CustomerSessionResponse> {
    const session = await this.tokens.issueSession(customer, this.context(req));
    res.cookie(
      CUSTOMER_REFRESH_COOKIE,
      session.refreshToken,
      this.tokens.cookieOptions(organization.slug),
    );
    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      customer: toProfile(customer),
    };
  }
}
