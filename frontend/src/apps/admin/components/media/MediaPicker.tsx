import { ImageIcon, Images, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { Button, EmptyState, Modal, Pagination } from "@/shared/ui";
import type { MediaAssetResponse, MediaRefResponse } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../access/access-context";
import { SearchInput } from "../AdminBits";
import { MediaGrid, UploadDropZone } from "./MediaGrid";
import { MEDIA_PAGE_SIZE, useMediaPage, useMediaUpload } from "./use-media";

/** Choose an image from the organization's library, or upload a new one. */
export function MediaPicker({
  open,
  onOpenChange,
  title,
  currentId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentId: number | null;
  onPick: (asset: MediaAssetResponse) => void;
}) {
  const organization = useCurrentOrganization();
  const canUpload = useCan("media.upload");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaAssetResponse | null>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const media = useMediaPage(organization.id, { page, q: q || undefined });
  const upload = useMediaUpload(organization.id);

  const close = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={close}
      size="lg"
      title={title}
      description="Pick an image from your library, or upload a new one."
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) onPick(selected);
              close(false);
            }}
          >
            Use this image
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search images"
          placeholder="Search by file name or description"
        />
        <UploadDropZone
          disabled={!canUpload}
          uploading={upload.isPending}
          multiple={false}
          onFiles={(files) =>
            upload.mutate(files, {
              onSuccess: (uploaded) => uploaded[0] && setSelected(uploaded[0]),
            })
          }
        >
          <MediaGrid
            items={media.data?.items}
            loading={media.isPending}
            selectedId={selected?.id ?? currentId}
            onPick={setSelected}
            empty={
              <EmptyState
                icon={Images}
                title={q ? `No images match “${q}”` : "Your library is empty"}
                description={canUpload ? "Upload an image to get started." : undefined}
              />
            }
          />
        </UploadDropZone>
        {media.data && media.data.meta.total > MEDIA_PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={MEDIA_PAGE_SIZE}
            total={media.data.meta.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </Modal>
  );
}

/**
 * An image setting (logo, cover, branch photo): preview, choose, remove.
 * Returns the media id through `onChange` (null clears it).
 */
export function ImageField({
  label,
  description,
  value,
  onChange,
  disabled,
  aspect = "square",
}: {
  label: string;
  description?: string;
  value: Pick<MediaRefResponse, "id" | "url" | "altText"> | null;
  onChange: (asset: MediaAssetResponse | null) => void;
  disabled?: boolean;
  aspect?: "square" | "wide";
}) {
  const canBrowse = useCan("media.view");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={
          aspect === "wide"
            ? "grid aspect-[16/7] w-48 shrink-0 place-items-center overflow-hidden rounded-card border border-line bg-surface-muted"
            : "grid size-24 shrink-0 place-items-center overflow-hidden rounded-card border border-line bg-surface-muted"
        }
      >
        {value ? (
          <img
            src={value.url}
            alt={value.altText ?? ""}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon size={22} className="text-ink-subtle" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>}
        {!disabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={Images}
              disabled={!canBrowse}
              onClick={() => setOpen(true)}
            >
              {value ? "Change" : "Choose image"}
            </Button>
            {value && (
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                onClick={() => onChange(null)}
              >
                Remove
              </Button>
            )}
          </div>
        )}
        {!disabled && !canBrowse && (
          <p className="mt-2 text-xs text-ink-subtle">
            Your role can’t open the media library.
          </p>
        )}
      </div>
      {canBrowse && (
        <MediaPicker
          open={open}
          onOpenChange={setOpen}
          title={`Choose ${label.toLowerCase()}`}
          currentId={value?.id ?? null}
          onPick={onChange}
        />
      )}
    </div>
  );
}
