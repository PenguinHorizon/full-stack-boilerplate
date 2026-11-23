import { Check, ImageIcon, Upload } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { Button, Skeleton } from "@/shared/ui";
import type { MediaAssetResponse } from "@/shared/types/api.generated";
import { IMAGE_ACCEPT } from "./use-media";

/** Thumbnails; `selectedId` marks the chosen one (picker mode). */
export function MediaGrid({
  items,
  loading,
  selectedId,
  onPick,
  empty,
}: {
  items: MediaAssetResponse[] | undefined;
  loading: boolean;
  selectedId?: number | null;
  onPick: (asset: MediaAssetResponse) => void;
  empty: ReactNode;
}) {
  if (loading && !items?.length) {
    return (
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-square w-full rounded-card" />
          </li>
        ))}
      </ul>
    );
  }
  if (!items?.length) return <>{empty}</>;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((asset) => {
        const selected = asset.id === selectedId;
        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => onPick(asset)}
              aria-pressed={selectedId === undefined ? undefined : selected}
              className={cn(
                "group relative block aspect-square w-full overflow-hidden rounded-card border bg-surface-muted",
                selected
                  ? "border-accent ring-2 ring-accent"
                  : "border-line hover:border-ink-subtle",
              )}
            >
              <img
                src={asset.url}
                alt={asset.altText ?? ""}
                loading="lazy"
                className="size-full object-cover"
              />
              <span className="sr-only">{asset.originalName ?? `Image ${asset.id}`}</span>
              {selected && (
                <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent text-on-accent">
                  <Check size={14} aria-hidden="true" />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Upload button plus a drop target around `children`. Calls `onFiles` with
 * the chosen images; the API does the real checking.
 */
export function UploadDropZone({
  onFiles,
  uploading,
  disabled,
  children,
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  disabled?: boolean;
  children?: ReactNode;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  const dropHandlers = disabled
    ? {}
    : {
        onDragOver: (event: DragEvent) => {
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        },
      };

  return (
    <div
      {...dropHandlers}
      className={cn(
        "rounded-card transition-shadow",
        dragging && "ring-2 ring-accent ring-offset-4 ring-offset-canvas",
      )}
    >
      {!disabled && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-4 py-3">
          <ImageIcon size={18} className="text-ink-subtle" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-ink-muted">
            Drop images here, or choose files. JPG, PNG, WebP, AVIF or GIF.
          </p>
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple={multiple}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              take(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={Upload}
            loading={uploading}
            onClick={() => input.current?.click()}
          >
            Upload
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
