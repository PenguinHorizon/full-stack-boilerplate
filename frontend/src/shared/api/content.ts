import type {
  AdminBannerResponse,
  AdminCustomerDetailResponse,
  AdminCustomerPageResponse,
  AdminFaqResponse,
  AdminGalleryImageResponse,
  AdminPageResponse,
  AdminSectionResponse,
  AdminTestimonialResponse,
  BannerPlacement,
  ContentStatus,
  CreatedIdResponse,
  InquiryPageResponse,
  InquiryResponse,
  InquiryStatus,
  MessageResponse,
  PageKey,
  SectionKey,
} from "@/shared/types/api.generated";
import { api } from "./client";

/* Staff endpoints: the website editors, customers and the inbox. */

const r = (orgId: number, path = "") => `admin/organizations/${orgId}${path}`;

/* ── Website content ───────────────────────────────────────────────── */

export interface SectionInput {
  key: SectionKey;
  isEnabled: boolean;
  title: string | null;
  subtitle: string | null;
  limit: number | null;
}

export interface BannerInput {
  placement: BannerPlacement;
  internalName: string;
  headline: string | null;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  desktopMediaId: number;
  mobileMediaId: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: ContentStatus;
}

export interface GalleryInput {
  mediaId: number;
  caption: string | null;
  tag: string | null;
  status: ContentStatus;
}

export interface TestimonialInput {
  authorName: string;
  authorDetail: string | null;
  quote: string;
  rating: number | null;
  source: string | null;
  avatarMediaId: number | null;
  status: ContentStatus;
}

export interface FaqInput {
  category: string;
  question: string;
  answer: string;
  status: ContentStatus;
}

export interface PageInput {
  title: string;
  body: string;
  heroMediaId: number | null;
  status: ContentStatus;
}

export type ContentKind = "banners" | "gallery" | "testimonials" | "faqs";

const content = (orgId: number, path: string) => r(orgId, `/content${path}`);

export const contentApi = {
  sections: (orgId: number) =>
    api.get<AdminSectionResponse[]>(content(orgId, "/sections")),
  saveSections: (orgId: number, sections: SectionInput[]) =>
    api.put<AdminSectionResponse[]>(content(orgId, "/sections"), { sections }),

  banners: (orgId: number) => api.get<AdminBannerResponse[]>(content(orgId, "/banners")),
  gallery: (orgId: number) =>
    api.get<AdminGalleryImageResponse[]>(content(orgId, "/gallery")),
  testimonials: (orgId: number) =>
    api.get<AdminTestimonialResponse[]>(content(orgId, "/testimonials")),
  faqs: (orgId: number) => api.get<AdminFaqResponse[]>(content(orgId, "/faqs")),

  create: <T extends object>(orgId: number, kind: ContentKind, body: T) =>
    api.post<CreatedIdResponse>(content(orgId, `/${kind}`), body),
  update: <T extends object>(
    orgId: number,
    kind: ContentKind,
    id: number,
    body: Partial<T>,
  ) => api.patch<CreatedIdResponse>(content(orgId, `/${kind}/${id}`), body),
  remove: (orgId: number, kind: ContentKind, id: number) =>
    api.delete<MessageResponse>(content(orgId, `/${kind}/${id}`)),
  reorder: (
    orgId: number,
    kind: ContentKind,
    items: Array<{ id: number; sortOrder: number }>,
  ) => api.put<MessageResponse>(content(orgId, `/${kind}/order`), { items }),

  page: (orgId: number, key: PageKey) =>
    api.get<AdminPageResponse>(content(orgId, `/pages/${key}`)),
  savePage: (orgId: number, key: PageKey, body: PageInput) =>
    api.put<AdminPageResponse>(content(orgId, `/pages/${key}`), body),
};

/* ── Customers & inbox ─────────────────────────────────────────────── */

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  status?: "active" | "blocked";
  hasAccount?: "true" | "false";
}

export const customersAdminApi = {
  list: (orgId: number, params: CustomerListParams) =>
    api.get<AdminCustomerPageResponse>(r(orgId, "/customers"), { params }),
  detail: (orgId: number, id: number) =>
    api.get<AdminCustomerDetailResponse>(r(orgId, `/customers/${id}`)),
  update: (
    orgId: number,
    id: number,
    body: {
      status?: "active" | "blocked";
      blockedReason?: string | null;
      adminNotes?: string | null;
    },
  ) => api.patch<AdminCustomerDetailResponse>(r(orgId, `/customers/${id}`), body),
};

export const inboxApi = {
  list: (orgId: number, params: { status?: InquiryStatus; q?: string; page?: number }) =>
    api.get<InquiryPageResponse>(r(orgId, "/inquiries"), {
      params: { ...params, pageSize: 20 },
    }),
  update: (orgId: number, id: number, status: InquiryStatus) =>
    api.patch<InquiryResponse>(r(orgId, `/inquiries/${id}`), { status }),
};
