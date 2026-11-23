import { ApiProperty } from '@nestjs/swagger';
import { PageMetaResponse } from './common.contracts';

/* Public-site customer accounts and the staff-side customer list. */

export class CustomerProfileResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() name: string;
  @ApiProperty({ example: '+923001234567' }) phone: string;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  registeredAt: string | null;
}

export class CustomerSessionResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: 'integer', description: 'Seconds' }) expiresIn: number;
  @ApiProperty({ type: () => CustomerProfileResponse })
  customer: CustomerProfileResponse;
}

export class AdminCustomerListItemResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty() name: string;
  @ApiProperty({ example: '+923001234567' }) phone: string;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty() hasAccount: boolean;
  @ApiProperty({ enum: ['active', 'blocked'] }) status: 'active' | 'blocked';
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class AdminCustomerPageResponse {
  @ApiProperty({ type: () => [AdminCustomerListItemResponse] })
  items: AdminCustomerListItemResponse[];
  @ApiProperty({ type: () => PageMetaResponse }) meta: PageMetaResponse;
}

export class AdminCustomerDetailResponse extends AdminCustomerListItemResponse {
  @ApiProperty({ type: String, nullable: true }) blockedReason: string | null;
  @ApiProperty({ type: String, nullable: true }) adminNotes: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  registeredAt: string | null;
}
