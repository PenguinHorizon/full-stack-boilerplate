/** Organization lifecycle. Only `active` organizations have a public website. */
export enum OrganizationStatus {
  Draft = 'draft',
  Active = 'active',
  Suspended = 'suspended',
  Archived = 'archived',
}

export enum MediaProvider {
  Local = 'local',
  Cloudinary = 'cloudinary',
}

/** Social networks an organization can link to (stored in `organizations.social_links`). */
export const SOCIAL_NETWORKS = [
  'facebook',
  'instagram',
  'tiktok',
  'x',
  'youtube',
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

/** Platform default brand colour. */
export const DEFAULT_BRAND_PRIMARY = '#C8553D';

/**
 * Organization-level staff roles (stored on `organization_users.role`).
 * Platform super admin is a flag on the user, not a role (ADR-006).
 * Permissions per role live in roles.config.ts.
 */
export enum OrganizationRole {
  Owner = 'OWNER',
  Admin = 'ADMIN',
  Manager = 'MANAGER',
  Member = 'MEMBER',
}
