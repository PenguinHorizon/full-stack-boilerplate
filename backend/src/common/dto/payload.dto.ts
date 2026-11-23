import { ApiProperty } from '@nestjs/swagger';

/**
 * The authenticated staff principal, built from JWT claims by JwtAuthGuard.
 *
 * It carries no role: roles are per organization (ADR-006) and are resolved per
 * request by TenantGuard into `request.tenant`, so removing a membership
 * takes effect immediately rather than when the token expires.
 */
export class PayloadDto {
  @ApiProperty({ type: Number, example: 1 })
  userId!: number;

  @ApiProperty({ type: String, example: 'USR000001' })
  userCode!: string;

  @ApiProperty({ type: String, example: 'owner@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'Amina Khan' })
  name!: string;

  @ApiProperty({ type: Boolean })
  isSuperAdmin!: boolean;
}
