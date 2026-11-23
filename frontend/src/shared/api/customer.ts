import type {
  CustomerProfileResponse,
  CustomerSessionResponse,
  MessageResponse,
} from "@/shared/types/api.generated";
import { api } from "./client";

/*
 * Public-website customer accounts (`/storefront/:slug/...`): sign-up,
 * sessions, password reset and the profile.
 */

const account = (slug: string, path = "") =>
  `storefront/${encodeURIComponent(slug)}${path}`;
const anonymous = { auth: false } as const;
/** Customer calls never carry the staff token; the caller passes its own. */
const asCustomer = (token: string | null) => ({
  auth: false,
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
});

export const customerApi = {
  register: (
    slug: string,
    body: { name: string; phone: string; email: string | null; password: string },
  ) =>
    api.post<CustomerSessionResponse>(account(slug, "/auth/register"), body, anonymous),
  login: (slug: string, body: { identifier: string; password: string }) =>
    api.post<CustomerSessionResponse>(account(slug, "/auth/login"), body, anonymous),
  refresh: (slug: string) =>
    api.post<CustomerSessionResponse>(account(slug, "/auth/refresh"), null, anonymous),
  logout: (slug: string) =>
    api.post<MessageResponse>(account(slug, "/auth/logout"), null, anonymous),
  forgotPassword: (slug: string, email: string) =>
    api.post<MessageResponse>(
      account(slug, "/auth/forgot-password"),
      { email },
      anonymous,
    ),
  resetPassword: (slug: string, body: { token: string; password: string }) =>
    api.post<CustomerSessionResponse>(
      account(slug, "/auth/reset-password"),
      body,
      anonymous,
    ),

  me: (slug: string, token: string | null) =>
    api.get<CustomerProfileResponse>(account(slug, "/me"), asCustomer(token)),
  updateMe: (
    slug: string,
    token: string | null,
    body: { name?: string; email?: string | null },
  ) => api.patch<CustomerProfileResponse>(account(slug, "/me"), body, asCustomer(token)),
  changePassword: (
    slug: string,
    token: string | null,
    body: { currentPassword: string; newPassword: string },
  ) =>
    api.put<CustomerSessionResponse>(
      account(slug, "/me/password"),
      body,
      asCustomer(token),
    ),
};
