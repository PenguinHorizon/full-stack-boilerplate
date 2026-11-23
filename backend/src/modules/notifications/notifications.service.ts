import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { permissionsFor, type Permission } from '@common/constants/roles.config';
import { TenantContext } from '@common/tenancy/tenant-context';
import {
  NotificationListResponse,
  NotificationResponse,
} from '@contracts/notifications.contracts';
import { Notification } from '@database/entities/identity/notification.entity';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';

const LATEST = 30;

const toResponse = (row: Notification): NotificationResponse => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  data: row.data,
  readAt: row.readAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

export interface NewNotification {
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

/**
 * In-app notifications for staff. Feature modules call `notifyPermitted()`
 * (e.g. a new inquiry → everyone with `inquiry.view`); the bell reads the
 * signed-in member's own list.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(OrganizationUser)
    private readonly memberships: Repository<OrganizationUser>,
  ) {}

  /** Notifies every active member of the organization whose role grants `permission`. */
  async notifyPermitted(
    organizationId: number,
    permission: Permission,
    notification: NewNotification,
  ): Promise<void> {
    const members = await this.memberships.find({
      where: { organizationId, isActive: true },
      select: { userId: true, role: true },
    });
    const userIds = members
      .filter((m) => permissionsFor(m.role).includes(permission))
      .map((m) => m.userId);
    await this.notifyUsers(organizationId, userIds, notification);
  }

  async notifyUsers(
    organizationId: number,
    userIds: number[],
    notification: NewNotification,
  ): Promise<void> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    await this.notifications.save(
      unique.map((userId) =>
        this.notifications.create({
          organizationId,
          userId,
          type: notification.type,
          title: notification.title,
          body: notification.body ?? null,
          data: notification.data ?? null,
        }),
      ),
    );
  }

  async list(
    ctx: TenantContext,
    unreadOnly: boolean,
  ): Promise<NotificationListResponse> {
    const mine = { organizationId: ctx.organizationId, userId: ctx.userId };
    const [rows, unreadCount] = await Promise.all([
      this.notifications.find({
        where: unreadOnly ? { ...mine, readAt: IsNull() } : mine,
        order: { createdAt: 'DESC', id: 'DESC' },
        take: LATEST,
      }),
      this.notifications.countBy({ ...mine, readAt: IsNull() }),
    ]);
    return { items: rows.map(toResponse), unreadCount };
  }

  async markRead(ctx: TenantContext, id: number): Promise<NotificationResponse> {
    const row = await this.notifications.findOneBy({
      id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });
    if (!row) throw new NotFoundException('Notification not found');
    if (!row.readAt) {
      row.readAt = new Date();
      await this.notifications.save(row);
    }
    return toResponse(row);
  }

  async markAllRead(ctx: TenantContext): Promise<number> {
    const result = await this.notifications.update(
      { organizationId: ctx.organizationId, userId: ctx.userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return result.affected ?? 0;
  }
}
