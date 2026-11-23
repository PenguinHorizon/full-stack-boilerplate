import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { mediaApi } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import type { MediaAssetResponse } from "@/shared/types/api.generated";

/** What the API accepts (it checks the bytes; this only filters the picker). */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

export const MEDIA_PAGE_SIZE = 24;

export function useMediaPage(orgId: number, params: { page: number; q?: string }) {
  const query = { ...params, pageSize: MEDIA_PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.mediaList(orgId, query),
    queryFn: () => mediaApi.list(orgId, query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Uploads files one at a time (each is checked and stored separately) and
 * reports per-file failures without stopping the rest.
 */
export function useMediaUpload(orgId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded: MediaAssetResponse[] = [];
      for (const file of files) {
        try {
          uploaded.push(await mediaApi.upload(orgId, file));
        } catch (error) {
          toast.error(`${file.name}: ${errorMessage(error)}`);
        }
      }
      return uploaded;
    },
    onSuccess: (uploaded) => {
      if (uploaded.length) {
        toast.success(
          uploaded.length === 1 ? "Image uploaded" : `${uploaded.length} images uploaded`,
        );
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.media(orgId) });
    },
  });
}
