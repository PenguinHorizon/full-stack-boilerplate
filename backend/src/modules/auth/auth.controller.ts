import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { UpdateProfileDto } from '@common/dto/users.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '@common/dto/auth.dto';
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '@common/config/configuration';
import {
  AccessTokenResponse,
  AuthSessionResponse,
  MessageResponse,
  StaffPrincipalResponse,
} from '@contracts/identity.contracts';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { User } from '@database/entities/identity/user.entity';
import { AuthService } from './auth.service';
import { StaffPrincipal, TokenService } from './token.service';

/** Tight limit on every credential-accepting route. */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Staff authentication. There is no self-registration: staff accounts are
 * created by organization owners/admins (team) or platform admins.
 */
@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOkResponse({ type: AuthSessionResponse })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    try {
      const user = await this.authService.validateCredentials(dto.email, dto.password);
      await this.auditLog.record(req, {
        userId: user.id,
        userName: user.name,
        action: 'login.success',
        module: 'auth',
        description: `${user.email} signed in`,
      });
      return await this.establishSession(user, req, res);
    } catch (error) {
      await this.auditLog.record(req, {
        action: 'login.failure',
        module: 'auth',
        description: `Failed sign-in for ${dto.email}`,
      });
      throw error;
    }
  }

  /**
   * Rotates the refresh cookie. Takes no body — the credential is the
   * httpOnly cookie, which JavaScript cannot read.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOkResponse({ type: AccessTokenResponse })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const presented = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!presented) {
      throw new UnauthorizedException('No refresh token');
    }

    const result = await this.tokenService.rotate(presented, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOkResponse({ type: MessageResponse })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    const presented = req.cookies?.[REFRESH_COOKIE_NAME];
    if (presented) {
      await this.tokenService.revokeByToken(presented);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
    return { message: 'Logged out' };
  }

  /** The signed-in user, read fresh from the database. */
  @Get('me')
  @ApiOkResponse({ type: StaffPrincipalResponse })
  async me(@CurrentUser() user: PayloadDto): Promise<StaffPrincipal> {
    return this.tokenService.buildPrincipal(
      await this.authService.findById(user.userId),
    );
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own name, phone or avatar' })
  @ApiOkResponse({ type: StaffPrincipalResponse })
  async updateMe(
    @CurrentUser() principal: PayloadDto,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<StaffPrincipal> {
    const user = await this.authService.updateProfile(principal.userId, dto);
    await this.auditLog.record(req, {
      userId: principal.userId,
      userName: user.name,
      action: 'profile.update',
      module: 'auth',
      entityType: 'user',
      entityId: String(principal.userId),
      description: `${principal.email} updated their profile`,
      metadata: { fields: Object.keys(dto) },
    });
    return this.tokenService.buildPrincipal(user);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Always returns the same message whether or not the address exists, and never returns the token itself.',
  })
  @ApiOkResponse({ type: MessageResponse })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If that email is registered, a reset link has been sent.',
    };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOkResponse({ type: MessageResponse })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<MessageResponse> {
    const user = await this.authService.resetPassword(dto.token, dto.password);
    await this.auditLog.record(req, {
      userId: user.id,
      userName: user.name,
      action: 'password.reset',
      module: 'auth',
      description: `Password reset completed for ${user.email}`,
    });
    return { message: 'Password reset successful' };
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponse })
  async changePassword(
    @CurrentUser() principal: PayloadDto,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.authService.changePassword(
      principal.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    await this.auditLog.record(req, {
      userId: principal.userId,
      userName: principal.name,
      action: 'password.change',
      module: 'auth',
      description: `${principal.email} changed their password`,
    });

    // All sessions were revoked; hand back a fresh one so the caller stays
    // signed in on this device.
    const user = await this.authService.findById(principal.userId);
    const tokens = await this.tokenService.issueSession(user, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);

    return { message: 'Password changed successfully' };
  }

  private async establishSession(
    user: User,
    req: Request,
    res: Response,
  ): Promise<AuthSessionResponse> {
    const tokens = await this.tokenService.issueSession(user, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    this.setRefreshCookie(res, tokens.refreshToken);

    return {
      user: this.tokenService.buildPrincipal(user),
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, this.cookieOptions());
  }

  private cookieOptions() {
    return refreshCookieOptions(
      {
        COOKIE_SECURE: this.config.get<string>('COOKIE_SECURE') ?? 'false',
        COOKIE_SAMESITE: this.config.get<string>('COOKIE_SAMESITE') ?? 'lax',
        COOKIE_DOMAIN: this.config.get<string>('COOKIE_DOMAIN'),
      },
      this.tokenService.refreshTokenTtl,
    );
  }
}
