import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { contentApi, type ContentKind } from "@/shared/api/content";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  Switch,
  useConfirmTarget,
} from "@/shared/ui";
import type { ContentStatus } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { SortableList } from "../../../components/SortableList";
import { useInvalidateContent } from "./website-hooks";

interface Item {
  id: number;
  status: ContentStatus;
}

/**
 * An ordered list of website items (gallery photos, reviews, FAQs): drag to
 * reorder, publish or unpublish in place, edit in a dialog, delete.
 */
export function ContentList<T extends Item>({
  kind,
  query,
  title,
  description,
  icon,
  addLabel,
  emptyTitle,
  emptyDescription,
  deleteDescription,
  itemLabel,
  renderItem,
  renderEditor,
}: {
  kind: Exclude<ContentKind, "banners">;
  query: UseQueryResult<T[]>;
  title: string;
  description: string;
  icon: LucideIcon;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  deleteDescription: string;
  itemLabel: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  renderEditor: (item: T | null, onClose: () => void) => ReactNode;
}) {
  const organization = useCurrentOrganization();
  const canManage = useCan("content.manage");
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContent(organization.id);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const deleting = useConfirmTarget<T>();

  const reorder = useMutation({
    mutationFn: (next: T[]) =>
      contentApi.reorder(
        organization.id,
        kind,
        next.map((item, index) => ({ id: item.id, sortOrder: index })),
      ),
    onMutate: (next) =>
      queryClient.setQueryData(queryKeys.contentKind(organization.id, kind), next),
    onSuccess: () => toast.success("Order saved"),
    onError: (error) => {
      toast.error(errorMessage(error));
      void invalidate(kind);
    },
  });
  const publish = useMutation({
    mutationFn: (item: T) =>
      contentApi.update(organization.id, kind, item.id, {
        status: item.status === "published" ? "draft" : "published",
      }),
    onSuccess: () => void invalidate(kind),
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (item: T) => contentApi.remove(organization.id, kind, item.id),
    onSuccess: () => {
      toast.success("Deleted");
      deleting.close();
      void invalidate(kind);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  let body: ReactNode;
  if (query.isPending) body = <Skeleton className="m-5 h-48" />;
  else if (query.isError)
    body = <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  else if (query.data.length === 0) {
    body = <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />;
  } else {
    body = (
      <SortableList
        items={query.data}
        label={itemLabel}
        disabled={!canManage || reorder.isPending}
        onReorder={(next) => reorder.mutate(next)}
        className="divide-y divide-line border-t border-line"
        renderItem={(item, handle) => (
          <div className="flex items-center gap-3 bg-surface px-3 py-2.5">
            {canManage && handle}
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
            {item.status === "draft" && <Badge tone="neutral">Draft</Badge>}
            {canManage && (
              <div className="flex items-center gap-1">
                <Switch
                  checked={item.status === "published"}
                  disabled={publish.isPending}
                  onCheckedChange={() => publish.mutate(item)}
                  label={<span className="sr-only">Publish {itemLabel(item)}</span>}
                />
                <IconButton
                  icon={Pencil}
                  label={`Edit ${itemLabel(item)}`}
                  onClick={() => setEditing(item)}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete ${itemLabel(item)}`}
                  onClick={() => deleting.ask(item)}
                />
              </div>
            )}
          </div>
        )}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        actions={
          canManage && (
            <Button
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() => setEditing("new")}
            >
              {addLabel}
            </Button>
          )
        }
      />
      {body}
      {editing &&
        renderEditor(editing === "new" ? null : editing, () => setEditing(null))}
      <ConfirmDialog
        open={deleting.open}
        onOpenChange={(open) => !open && deleting.close()}
        title={deleting.target ? `Delete “${itemLabel(deleting.target)}”?` : "Delete?"}
        description={deleteDescription}
        confirmLabel="Delete"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => deleting.target && remove.mutate(deleting.target)}
      />
    </Card>
  );
}

/** The Published switch at the foot of each editor dialog. */
export function PublishedSwitch({
  value,
  onChange,
}: {
  value: ContentStatus;
  onChange: (value: ContentStatus) => void;
}) {
  return (
    <Switch
      checked={value === "published"}
      onCheckedChange={(on) => onChange(on ? "published" : "draft")}
      label="Published"
      description="Drafts appear only in the preview."
    />
  );
}
