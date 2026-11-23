import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Images, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { mediaApi } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatBytes, formatDate } from "@/shared/lib/format";
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  PageHeader,
  Pagination,
} from "@/shared/ui";
import type { MediaAssetResponse } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { SearchInput } from "../../../components/AdminBits";
import { MediaGrid, UploadDropZone } from "../../../components/media/MediaGrid";
import {
  MEDIA_PAGE_SIZE,
  useMediaPage,
  useMediaUpload,
} from "../../../components/media/use-media";

export function MediaLibraryPage() {
  const organization = useCurrentOrganization();
  const canUpload = useCan("media.upload");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaAssetResponse | null>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const media = useMediaPage(organization.id, { page, q: q || undefined });
  const upload = useMediaUpload(organization.id);

  return (
    <>
      <title>{`Media library · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Media library"
        description="Images for your logo, website and branches. Upload once, use anywhere."
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Media library" },
        ]}
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search images"
          placeholder="Search by file name or description"
        />
      </div>

      {media.isError ? (
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      ) : (
        <UploadDropZone
          disabled={!canUpload}
          uploading={upload.isPending}
          onFiles={(files) => upload.mutate(files)}
        >
          <MediaGrid
            items={media.data?.items}
            loading={media.isPending}
            onPick={setSelected}
            empty={
              <EmptyState
                icon={Images}
                title={q ? `No images match “${q}”` : "No images yet"}
                description={
                  q
                    ? "Try another name."
                    : canUpload
                      ? "Upload your logo, a cover photo and branch pictures to get started."
                      : undefined
                }
              />
            }
          />
        </UploadDropZone>
      )}

      {media.data && media.data.meta.total > MEDIA_PAGE_SIZE && (
        <div className="mt-4">
          <Pagination
            page={page}
            pageSize={MEDIA_PAGE_SIZE}
            total={media.data.meta.total}
            onPageChange={setPage}
          />
        </div>
      )}

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Image details"
        side="right"
      >
        {selected && (
          <MediaDetails
            key={selected.id}
            asset={selected}
            onChanged={setSelected}
            onDeleted={() => setSelected(null)}
          />
        )}
      </Drawer>
    </>
  );
}

function MediaDetails({
  asset,
  onChanged,
  onDeleted,
}: {
  asset: MediaAssetResponse;
  onChanged: (asset: MediaAssetResponse) => void;
  onDeleted: () => void;
}) {
  const organization = useCurrentOrganization();
  const queryClient = useQueryClient();
  const canEdit = useCan("media.upload");
  const canDelete = useCan("media.delete");
  const [altText, setAltText] = useState(asset.altText ?? "");
  const [confirming, setConfirming] = useState(false);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.media(organization.id) });

  const save = useMutation({
    mutationFn: () => mediaApi.update(organization.id, asset.id, altText.trim() || null),
    onSuccess: (saved) => {
      toast.success("Description saved");
      onChanged(saved);
      void refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => mediaApi.remove(organization.id, asset.id),
    onSuccess: () => {
      toast.success("Image deleted");
      setConfirming(false);
      onDeleted();
      void refresh();
    },
    // 409 MEDIA_IN_USE says where it is used ("as the logo").
    onError: (error) => {
      setConfirming(false);
      toast.error(errorMessage(error));
    },
  });

  const absoluteUrl = new URL(asset.url, window.location.origin).toString();
  const facts: Array<[string, string]> = [
    ["File", asset.originalName ?? "—"],
    ["Size", formatBytes(asset.sizeBytes)],
    [
      "Dimensions",
      asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "—",
    ],
    ["Type", asset.mimeType.replace("image/", "").toUpperCase()],
    ["Uploaded", formatDate(asset.createdAt)],
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-card border border-line bg-surface-muted">
        <img
          src={asset.url}
          alt={asset.altText ?? ""}
          className="max-h-72 w-full object-contain"
        />
      </div>

      <dl className="divide-y divide-line text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-3 py-2">
            <dt className="text-ink-subtle">{label}</dt>
            <dd className="col-span-2 break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <Button
        variant="secondary"
        size="sm"
        icon={Copy}
        onClick={() => {
          void navigator.clipboard
            ?.writeText(absoluteUrl)
            .then(() => toast.success("Link copied"));
        }}
      >
        Copy link
      </Button>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <FormField
          label="Description"
          hint="Read aloud by screen readers. Describe what's in the picture, e.g. “Hikers on a ridge above the valley”."
        >
          {(field) => (
            <Input
              {...field}
              value={altText}
              maxLength={255}
              readOnly={!canEdit}
              onChange={(event) => setAltText(event.target.value)}
            />
          )}
        </FormField>
        {canEdit && (
          <Button
            type="submit"
            size="sm"
            loading={save.isPending}
            disabled={altText.trim() === (asset.altText ?? "")}
          >
            Save description
          </Button>
        )}
      </form>

      {canDelete && (
        <div className="border-t border-line pt-5">
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setConfirming(true)}
          >
            Delete image
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Delete this image?"
            description="It is removed from your library for good. Images that are in use (logo, branch photos) can't be deleted until you replace them."
            confirmLabel="Delete image"
            loading={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        </div>
      )}
    </div>
  );
}
