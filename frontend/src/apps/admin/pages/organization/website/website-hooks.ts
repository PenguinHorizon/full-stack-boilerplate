import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { contentApi, type ContentKind } from "@/shared/api/content";
import { queryKeys } from "@/shared/api/query";
import type { PageKey } from "@/shared/types/api.generated";

export function useSections(orgId: number) {
  return useQuery({
    queryKey: queryKeys.contentKind(orgId, "sections"),
    queryFn: () => contentApi.sections(orgId),
  });
}

export function useBanners(orgId: number) {
  return useQuery({
    queryKey: queryKeys.contentKind(orgId, "banners"),
    queryFn: () => contentApi.banners(orgId),
  });
}

export function useGallery(orgId: number) {
  return useQuery({
    queryKey: queryKeys.contentKind(orgId, "gallery"),
    queryFn: () => contentApi.gallery(orgId),
  });
}

export function useTestimonials(orgId: number) {
  return useQuery({
    queryKey: queryKeys.contentKind(orgId, "testimonials"),
    queryFn: () => contentApi.testimonials(orgId),
  });
}

export function useFaqs(orgId: number) {
  return useQuery({
    queryKey: queryKeys.contentKind(orgId, "faqs"),
    queryFn: () => contentApi.faqs(orgId),
  });
}

export function useContentPage(orgId: number, key: PageKey) {
  return useQuery({
    queryKey: queryKeys.contentPage(orgId, key),
    queryFn: () => contentApi.page(orgId, key),
  });
}

/** After a write: that list, plus the media library's "in use" flags. */
export function useInvalidateContent(orgId: number) {
  const queryClient = useQueryClient();
  return useCallback(
    (kind?: ContentKind | "sections") =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: kind ? queryKeys.contentKind(orgId, kind) : queryKeys.content(orgId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.media(orgId) }),
      ]),
    [queryClient, orgId],
  );
}
