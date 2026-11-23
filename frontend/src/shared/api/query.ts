import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Retrying auth, permission, not-found or validation failures only
        // burns requests; the client already does the one legitimate 401 retry.
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

/**
 * Query keys: [audience, scope, resource, params]. Invalidate by prefix: everything
 * staff-side starts with "admin", one organization with ["admin", "r", orgId].
 */
export const queryKeys = {
  site: (slug: string) => ["public", slug, "site"] as const,
  siteResolve: (host: string) => ["public", "resolve", host] as const,
  directory: (params: object) => ["public", "directory", params] as const,
  siteHome: (slug: string) => ["public", slug, "home"] as const,
  sitePage: (slug: string, key: string) => ["public", slug, "page", key] as const,
  siteFaqs: (slug: string) => ["public", slug, "faqs"] as const,
  siteGallery: (slug: string, tag: string | null) =>
    ["public", slug, "gallery", tag] as const,

  /** Everything of the signed-in customer: invalidate by prefix on sign-out. */
  customer: (slug: string) => ["customer", slug] as const,
  customerMe: (slug: string) => ["customer", slug, "me"] as const,

  staffMe: ["admin", "me"] as const,
  myOrganizations: ["admin", "me", "organizations"] as const,

  organization: (orgId: number) => ["admin", "r", orgId] as const,
  organizationProfile: (orgId: number) => ["admin", "r", orgId, "profile"] as const,
  organizationSettings: (orgId: number) => ["admin", "r", orgId, "settings"] as const,
  organizationDashboard: (orgId: number) => ["admin", "r", orgId, "dashboard"] as const,
  media: (orgId: number) => ["admin", "r", orgId, "media"] as const,
  mediaList: (orgId: number, params: object) =>
    ["admin", "r", orgId, "media", params] as const,
  team: (orgId: number) => ["admin", "r", orgId, "team"] as const,
  teamList: (orgId: number, params: object) =>
    ["admin", "r", orgId, "team", params] as const,
  organizationAudit: (orgId: number, params: object) =>
    ["admin", "r", orgId, "audit", params] as const,
  notifications: (orgId: number) => ["admin", "r", orgId, "notifications"] as const,
  /** Website content of an organization. */
  content: (orgId: number) => ["admin", "r", orgId, "content"] as const,
  contentKind: (orgId: number, kind: string) =>
    ["admin", "r", orgId, "content", kind] as const,
  contentPage: (orgId: number, key: string) =>
    ["admin", "r", orgId, "content", "page", key] as const,
  customers: (orgId: number) => ["admin", "r", orgId, "customers"] as const,
  customerList: (orgId: number, params: object) =>
    ["admin", "r", orgId, "customers", "list", params] as const,
  adminCustomer: (orgId: number, id: number) =>
    ["admin", "r", orgId, "customers", id] as const,
  inbox: (orgId: number) => ["admin", "r", orgId, "inbox"] as const,
  inboxList: (orgId: number, params: object) =>
    ["admin", "r", orgId, "inbox", params] as const,

  platform: ["admin", "platform"] as const,
  platformDashboard: ["admin", "platform", "dashboard"] as const,
  platformOrganizations: ["admin", "platform", "organizations"] as const,
  platformOrganizationList: (params: object) =>
    ["admin", "platform", "organizations", params] as const,
  platformUsers: ["admin", "platform", "users"] as const,
  platformUserList: (params: object) => ["admin", "platform", "users", params] as const,
  platformAudit: (params: object) => ["admin", "platform", "audit", params] as const,
};
