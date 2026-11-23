import type { OrganizationRole } from "@/shared/auth/access";
import type {
  AccessibleOrganizationResponse,
  AuditLogPageResponse,
  AuthSessionResponse,
  FaqGroupResponse,
  GalleryResponse,
  HomeResponse,
  MediaAssetResponse,
  MediaPageResponse,
  MessageResponse,
  NotificationListResponse,
  NotificationResponse,
  PlatformDashboardResponse,
  PlatformOrganizationPageResponse,
  PlatformOrganizationResponse,
  PlatformUserPageResponse,
  PlatformUserResponse,
  OrganizationAdminSummaryResponse,
  OrganizationDashboardResponse,
  OrganizationDirectoryPageResponse,
  OrganizationProfileResponse,
  OrganizationSettingsResponse,
  SiteBootstrapResponse,
  SitePageResponse,
  SiteResolveResponse,
  StaffPrincipalResponse,
  TeamMemberPageResponse,
  TeamMemberResponse,
} from "@/shared/types/api.generated";
import { api, type RequestOptions } from "./client";

/*
 * One typed function per endpoint. Components call these through TanStack
 * Query hooks, never axios directly.
 */

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
}

export type OrganizationStatus = PlatformOrganizationResponse["status"];

/* ── Public storefront ─────────────────────────────────────────────── */

/** a staff token that asks for drafts too. The API checks `content.view`. */
export interface PreviewAuth {
  token: string;
}

function withPreview(
  preview: PreviewAuth | null | undefined,
  params?: object,
): RequestOptions {
  if (!preview) return { auth: false, params };
  return {
    auth: false,
    params: { ...params, preview: "1" },
    headers: { Authorization: `Bearer ${preview.token}` },
  };
}

export const publicApi = {
  resolveSite: (host: string) =>
    api.get<SiteResolveResponse>("public/sites/resolve", {
      params: { host },
      auth: false,
    }),
  siteBootstrap: (slug: string, preview?: PreviewAuth | null) =>
    api.get<SiteBootstrapResponse>(
      `public/organizations/${encodeURIComponent(slug)}`,
      withPreview(preview),
    ),
  directory: (params: ListParams & { city?: string }) =>
    api.get<OrganizationDirectoryPageResponse>("public/organizations", {
      params,
      auth: false,
    }),
};

/* ── Storefront ──────────────────────────────────────────────────── */

export type SitePageKey = "about" | "privacy" | "terms";

export interface InquiryInput {
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  /** Honeypot: always empty from real people. */
  website?: string;
}

const site = (slug: string, path = "") =>
  `public/organizations/${encodeURIComponent(slug)}${path}`;
const anonymous = { auth: false } as const;

export const storefrontApi = {
  home: (slug: string, preview?: PreviewAuth | null) =>
    api.get<HomeResponse>(site(slug, "/home"), withPreview(preview)),
  page: (slug: string, key: SitePageKey, preview?: PreviewAuth | null) =>
    api.get<SitePageResponse>(site(slug, `/pages/${key}`), withPreview(preview)),
  faqs: (slug: string, preview?: PreviewAuth | null) =>
    api.get<FaqGroupResponse[]>(site(slug, "/faqs"), withPreview(preview)),
  gallery: (slug: string, tag?: string | null, preview?: PreviewAuth | null) =>
    api.get<GalleryResponse>(
      site(slug, "/gallery"),
      withPreview(preview, tag ? { tag } : undefined),
    ),
  sendInquiry: (slug: string, body: InquiryInput) =>
    api.post<MessageResponse>(site(slug, "/inquiries"), body, anonymous),
};

/* ── Staff auth and own profile ────────────────────────────────────── */

export interface ProfileUpdate {
  name?: string;
  phone?: string | null;
}

export const staffAuthApi = {
  login: (body: { email: string; password: string }) =>
    api.post<AuthSessionResponse>("auth/login", body, { auth: false }),
  logout: () => api.post<MessageResponse>("auth/logout", null, { auth: false }),
  me: () => api.get<StaffPrincipalResponse>("auth/me"),
  updateMe: (body: ProfileUpdate) => api.patch<StaffPrincipalResponse>("auth/me", body),
  forgotPassword: (body: { email: string }) =>
    api.post<MessageResponse>("auth/forgot-password", body, { auth: false }),
  resetPassword: (body: { token: string; password: string }) =>
    api.post<MessageResponse>("auth/reset-password", body, { auth: false }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.put<MessageResponse>("auth/change-password", body),
};

/** Organizations the signed-in user can open (switcher + permissions). */
export const accessApi = {
  myOrganizations: () =>
    api.get<AccessibleOrganizationResponse[]>("admin/me/organizations"),
};

/* ── Organization admin (/admin/organizations/:orgId/…) ──────────────────── */

export interface AddTeamMemberInput {
  email: string;
  name: string;
  role: OrganizationRole;
  password?: string;
}

export interface UpdateTeamMemberInput {
  role?: OrganizationRole;
  isActive?: boolean;
}

export interface AuditParams extends ListParams {
  userId?: number;
  entityType?: string;
}

const r = (orgId: number, path = "") => `admin/organizations/${orgId}${path}`;

export type ProfileInput = Partial<
  Omit<
    OrganizationProfileResponse,
    "id" | "slug" | "status" | "logo" | "cover" | "favicon" | "updatedAt"
  > & {
    logoMediaId: number | null;
    coverMediaId: number | null;
    faviconMediaId: number | null;
  }
>;

export type SettingsInput = Partial<Omit<OrganizationSettingsResponse, "updatedAt">>;

export const organizationApi = {
  profile: (orgId: number) => api.get<OrganizationProfileResponse>(r(orgId)),
  updateProfile: (orgId: number, body: ProfileInput) =>
    api.patch<OrganizationProfileResponse>(r(orgId), body),
  settings: (orgId: number) =>
    api.get<OrganizationSettingsResponse>(r(orgId, "/settings")),
  updateSettings: (orgId: number, body: SettingsInput) =>
    api.patch<OrganizationSettingsResponse>(r(orgId, "/settings"), body),
  dashboard: (orgId: number) =>
    api.get<OrganizationDashboardResponse>(r(orgId, "/dashboard")),
  auditLogs: (orgId: number, params: AuditParams) =>
    api.get<AuditLogPageResponse>(r(orgId, "/audit-logs"), { params }),
};

/* ── Media library ─────────────────────────────────────────────────── */

export const mediaApi = {
  list: (orgId: number, params: ListParams) =>
    api.get<MediaPageResponse>(r(orgId, "/media"), { params }),
  /** Multipart; the browser sets the boundary. */
  upload: (orgId: number, file: File, altText?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (altText) form.append("altText", altText);
    return api.post<MediaAssetResponse>(r(orgId, "/media"), form, { timeout: 120_000 });
  },
  update: (orgId: number, id: number, altText: string | null) =>
    api.patch<MediaAssetResponse>(r(orgId, `/media/${id}`), { altText }),
  remove: (orgId: number, id: number) =>
    api.delete<MessageResponse>(r(orgId, `/media/${id}`)),
};

export const teamApi = {
  list: (orgId: number, params: ListParams) =>
    api.get<TeamMemberPageResponse>(r(orgId, "/team"), { params }),
  add: (orgId: number, body: AddTeamMemberInput) =>
    api.post<TeamMemberResponse>(r(orgId, "/team"), body),
  update: (orgId: number, membershipId: number, body: UpdateTeamMemberInput) =>
    api.patch<TeamMemberResponse>(r(orgId, `/team/${membershipId}`), body),
  remove: (orgId: number, membershipId: number) =>
    api.delete<MessageResponse>(r(orgId, `/team/${membershipId}`)),
  sendPasswordReset: (orgId: number, membershipId: number) =>
    api.post<MessageResponse>(r(orgId, `/team/${membershipId}/password-reset`)),
};

/* ── Platform administration (super admins) ────────────────────────── */

export interface OnboardOrganizationInput {
  name: string;
  slug: string;
  owner: { email: string; name: string; password?: string };
}

export interface UpdatePlatformOrganizationInput {
  name?: string;
  slug?: string;
  status?: OrganizationStatus;
}

export interface UpdatePlatformUserInput {
  name?: string;
  isActive?: boolean;
  isSuperAdmin?: boolean;
}

export const platformApi = {
  dashboard: () => api.get<PlatformDashboardResponse>("platform/dashboard"),
  organizations: (params: ListParams) =>
    api.get<PlatformOrganizationPageResponse>("platform/organizations", { params }),
  onboardOrganization: (body: OnboardOrganizationInput) =>
    api.post<OrganizationAdminSummaryResponse>("platform/organizations", body),
  updateOrganization: (id: number, body: UpdatePlatformOrganizationInput) =>
    api.patch<OrganizationAdminSummaryResponse>(`platform/organizations/${id}`, body),
  users: (params: ListParams) =>
    api.get<PlatformUserPageResponse>("platform/users", { params }),
  updateUser: (id: number, body: UpdatePlatformUserInput) =>
    api.patch<PlatformUserResponse>(`platform/users/${id}`, body),
  removeUser: (id: number) => api.delete<MessageResponse>(`platform/users/${id}`),
  auditLogs: (params: AuditParams & { organizationId?: number }) =>
    api.get<AuditLogPageResponse>("platform/audit-logs", { params }),
};

/* ── Staff notifications (the bell) ───────────────────────────────── */

export const notificationsApi = {
  list: (orgId: number) => api.get<NotificationListResponse>(r(orgId, "/notifications")),
  read: (orgId: number, id: number) =>
    api.post<NotificationResponse>(r(orgId, `/notifications/${id}/read`)),
  readAll: (orgId: number) =>
    api.post<MessageResponse>(r(orgId, "/notifications/read-all")),
};
