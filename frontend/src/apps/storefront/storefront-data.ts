import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { storefrontApi, type SitePageKey } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { previewAuth } from "./preview";
import { useSite } from "./site-context";

/* The query hooks every storefront page uses. */

/** Staff credentials when the tab is in preview, else none. */
const auth = async (preview: boolean | undefined) => (preview ? previewAuth() : null);

export function useHome() {
  const { slug, preview } = useSite();
  return useQuery({
    queryKey: queryKeys.siteHome(slug),
    queryFn: async () => storefrontApi.home(slug, await auth(preview)),
  });
}

export function useSitePage(key: SitePageKey) {
  const { slug, preview } = useSite();
  return useQuery({
    queryKey: queryKeys.sitePage(slug, key),
    queryFn: async () => storefrontApi.page(slug, key, await auth(preview)),
  });
}

export function useFaqs() {
  const { slug, preview } = useSite();
  return useQuery({
    queryKey: queryKeys.siteFaqs(slug),
    queryFn: async () => storefrontApi.faqs(slug, await auth(preview)),
  });
}

export function useGallery(tag: string | null) {
  const { slug, preview } = useSite();
  return useQuery({
    queryKey: queryKeys.siteGallery(slug, tag),
    queryFn: async () => storefrontApi.gallery(slug, tag, await auth(preview)),
    placeholderData: keepPreviousData,
  });
}
