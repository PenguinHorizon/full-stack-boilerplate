/**
 * Internal input for AuditLogService.record(). Not a request body.
 * Organization-level events carry `organizationId`; `entityType` / `entityId`
 * let the audit log answer "what happened to this record?".
 */
export class CreateAuditLogDto {
  organizationId?: number | null;
  userId?: number | null;
  userName?: string | null;
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
