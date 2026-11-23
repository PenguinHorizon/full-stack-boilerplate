import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PayloadDto } from '@common/dto/payload.dto';
import { AccessibleOrganizationResponse } from '@contracts/identity.contracts';
import { AccessService } from './access.service';

@ApiTags('Admin - Access')
@ApiBearerAuth()
@Controller('admin/me')
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('organizations')
  @ApiOperation({
    summary:
      'Organizations the signed-in user can open, with their role and permissions in each',
  })
  @ApiOkResponse({ type: [AccessibleOrganizationResponse] })
  organizations(@CurrentUser() user: PayloadDto) {
    return this.access.accessibleOrganizations(user.userId);
  }
}
