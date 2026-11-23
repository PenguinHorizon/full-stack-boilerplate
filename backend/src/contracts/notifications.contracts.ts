import { ApiProperty } from '@nestjs/swagger';

/* In-app notifications for staff (the admin bell). */

export class NotificationResponse {
  @ApiProperty({ type: 'integer' }) id: number;
  @ApiProperty({ example: 'inquiry.received' }) type: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) body: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  data: Record<string, unknown> | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class NotificationListResponse {
  @ApiProperty({ type: () => [NotificationResponse] }) items: NotificationResponse[];
  @ApiProperty({ type: 'integer' }) unreadCount: number;
}
