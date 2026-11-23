import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import type { z } from "zod";
import { contentApi, type BannerInput } from "@/shared/api/content";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatDate } from "@/shared/lib/format";
import {
  bannerInput,
  bannerSchema,
  bannerToValues,
  type BannerValues,
} from "@/shared/schemas/content";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormAlert,
  FormField,
  IconButton,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
  useConfirmTarget,
} from "@/shared/ui";
import type { AdminBannerResponse, BannerPlacement } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { ImageField } from "../../../components/media/MediaPicker";
import { SortableList } from "../../../components/SortableList";
import { useBanners, useInvalidateContent } from "./website-hooks";

const PLACEMENTS: Array<{ value: BannerPlacement; label: string; description: string }> =
  [
    {
      value: "hero",
      label: "Home page slider",
      description: "The large slides at the top of the home page.",
    },
    {
      value: "home",
      label: "Home page strip",
      description: "Highlight banners just below the slider.",
    },
  ];

type Image = { id: number; url: string; altText: string | null };

function BannerModal({
  banner,
  placement,
  onClose,
}: {
  banner: AdminBannerResponse | null;
  placement: BannerPlacement;
  onClose: () => void;
}) {
  const organization = useCurrentOrganization();
  const invalidate = useInvalidateContent(organization.id);
  const [formError, setFormError] = useState<string | null>(null);
  const [desktop, setDesktop] = useState<Image | null>(
    banner ? { id: banner.desktopMediaId, url: banner.desktopUrl, altText: null } : null,
  );
  const [mobile, setMobile] = useState<Image | null>(
    banner?.mobileMediaId && banner.mobileUrl
      ? { id: banner.mobileMediaId, url: banner.mobileUrl, altText: null }
      : null,
  );
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BannerValues, unknown, z.output<typeof bannerSchema>>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      ...bannerToValues(banner, organization.timezone),
      placement: banner?.placement ?? placement,
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const body = bannerInput(values, organization.timezone);
      if (banner)
        await contentApi.update<BannerInput>(organization.id, "banners", banner.id, body);
      else await contentApi.create<BannerInput>(organization.id, "banners", body);
      toast.success(banner ? "Banner saved" : "Banner added");
      void invalidate("banners");
      onClose();
    } catch (error) {
      setFormError(
        applyServerErrors(error, setError, [
          "internalName",
          "headline",
          "subheadline",
          "ctaLabel",
          "ctaUrl",
          "desktopMediaId",
          "mobileMediaId",
          "startsAt",
          "endsAt",
        ]),
      );
    }
  });

  return (
    <Modal
      open
      size="lg"
      onOpenChange={(open) => !open && onClose()}
      title={banner ? `Edit ${banner.internalName}` : "Add a banner"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="banner-form" loading={isSubmitting}>
            {banner ? "Save" : "Add banner"}
          </Button>
        </>
      }
    >
      <form id="banner-form" noValidate onSubmit={submit} className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            required
            error={errors.internalName?.message}
            hint="Only staff see this."
          >
            {(field) => <Input {...field} {...register("internalName")} />}
          </FormField>
          <FormField label="Where">
            {(field) => (
              <Controller
                control={control}
                name="placement"
                render={({ field: f }) => (
                  <Select
                    id={field.id}
                    value={f.value}
                    onValueChange={f.onChange}
                    options={PLACEMENTS.map(({ value, label }) => ({ value, label }))}
                  />
                )}
              />
            )}
          </FormField>
        </div>
        <ImageField
          label="Image"
          description="Wide, at least 1600 × 700 pixels."
          aspect="wide"
          value={desktop}
          onChange={(asset) => {
            setDesktop(
              asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null,
            );
            setValue("desktopMediaId", asset?.id ?? null, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
        {errors.desktopMediaId && (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.desktopMediaId.message}
          </p>
        )}
        <ImageField
          label="Phone image (optional)"
          description="Taller crop for small screens; the main image is used if empty."
          value={mobile}
          onChange={(asset) => {
            setMobile(
              asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null,
            );
            setValue("mobileMediaId", asset?.id ?? null, { shouldDirty: true });
          }}
        />
        <FormField label="Headline" error={errors.headline?.message}>
          {(field) => <Input {...field} {...register("headline")} />}
        </FormField>
        <FormField label="Text under the headline" error={errors.subheadline?.message}>
          {(field) => <Input {...field} {...register("subheadline")} />}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Button label"
            error={errors.ctaLabel?.message}
            hint="e.g. Explore trips"
          >
            {(field) => <Input {...field} {...register("ctaLabel")} />}
          </FormField>
          <FormField
            label="Button link"
            error={errors.ctaUrl?.message}
            hint="A page like /about, or an https:// link"
          >
            {(field) => (
              <Input {...field} {...register("ctaUrl")} placeholder="/contact" />
            )}
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Show from"
            error={errors.startsAt?.message}
            hint="Empty = now"
          >
            {(field) => (
              <Input {...field} type="datetime-local" {...register("startsAt")} />
            )}
          </FormField>
          <FormField label="Until" error={errors.endsAt?.message} hint="Empty = no end">
            {(field) => (
              <Input {...field} type="datetime-local" {...register("endsAt")} />
            )}
          </FormField>
        </div>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Switch
              checked={field.value === "published"}
              onCheckedChange={(on) => field.onChange(on ? "published" : "draft")}
              label="Published"
              description="Drafts appear only in the preview."
            />
          )}
        />
      </form>
    </Modal>
  );
}

function bannerState(banner: AdminBannerResponse) {
  if (banner.status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return banner.isLive ? (
    <Badge tone="success" dot>
      Live
    </Badge>
  ) : (
    <Badge tone="info">Scheduled or ended</Badge>
  );
}

/** `/admin/:orgId/website/banners`. */
export function BannersPage() {
  const organization = useCurrentOrganization();
  const canManage = useCan("content.manage");
  const banners = useBanners(organization.id);
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContent(organization.id);
  const [editing, setEditing] = useState<{
    banner: AdminBannerResponse | null;
    placement: BannerPlacement;
  } | null>(null);
  const deleting = useConfirmTarget<AdminBannerResponse>();
  const key = queryKeys.contentKind(organization.id, "banners");

  const reorder = useMutation({
    mutationFn: (next: AdminBannerResponse[]) =>
      contentApi.reorder(
        organization.id,
        "banners",
        next.map((banner, index) => ({ id: banner.id, sortOrder: index })),
      ),
    onMutate: (next) => queryClient.setQueryData(key, next),
    onSuccess: () => toast.success("Order saved"),
    onError: (error) => {
      toast.error(errorMessage(error));
      void invalidate("banners");
    },
  });
  const publish = useMutation({
    mutationFn: (banner: AdminBannerResponse) =>
      contentApi.update(organization.id, "banners", banner.id, {
        status: banner.status === "published" ? "draft" : "published",
      }),
    onSuccess: () => void invalidate("banners"),
    onError: (error) => toast.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (banner: AdminBannerResponse) =>
      contentApi.remove(organization.id, "banners", banner.id),
    onSuccess: () => {
      toast.success("Banner deleted");
      deleting.close();
      void invalidate("banners");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (banners.isPending) return <Skeleton className="h-96 w-full" />;
  if (banners.isError) {
    return (
      <Card>
        <ErrorState error={banners.error} onRetry={() => banners.refetch()} />
      </Card>
    );
  }
  const all = banners.data;

  return (
    <>
      {PLACEMENTS.map((placement) => {
        const items = all.filter((banner) => banner.placement === placement.value);
        return (
          <Card key={placement.value}>
            <CardHeader
              title={placement.label}
              description={placement.description}
              actions={
                canManage && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() =>
                      setEditing({ banner: null, placement: placement.value })
                    }
                  >
                    Add banner
                  </Button>
                )
              }
            />
            {items.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="No banners here"
                description={
                  placement.value === "hero"
                    ? "Without slides, the home page opens with your cover image."
                    : undefined
                }
              />
            ) : (
              <SortableList
                items={items}
                label={(banner) => banner.internalName}
                disabled={!canManage || reorder.isPending}
                className="divide-y divide-line border-t border-line"
                onReorder={(next) =>
                  reorder.mutate([
                    ...all.filter((banner) => banner.placement !== placement.value),
                    ...next,
                  ])
                }
                renderItem={(banner, handle) => (
                  <div className="flex items-center gap-3 bg-surface px-3 py-2.5">
                    {canManage && handle}
                    <img
                      src={banner.desktopUrl}
                      alt=""
                      className="aspect-[16/7] w-28 shrink-0 rounded-control border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">
                        {banner.internalName}
                      </p>
                      <p className="truncate text-xs text-ink-subtle">
                        {banner.headline ?? "No headline"}
                        {banner.endsAt &&
                          ` · until ${formatDate(banner.endsAt, { dateStyle: "medium", timeZone: organization.timezone })}`}
                      </p>
                    </div>
                    <div className="hidden sm:block">{bannerState(banner)}</div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={banner.status === "published"}
                          disabled={publish.isPending}
                          onCheckedChange={() => publish.mutate(banner)}
                          label={
                            <span className="sr-only">Publish {banner.internalName}</span>
                          }
                        />
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${banner.internalName}`}
                          onClick={() =>
                            setEditing({ banner, placement: banner.placement })
                          }
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${banner.internalName}`}
                          onClick={() => deleting.ask(banner)}
                        />
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </Card>
        );
      })}
      {editing && (
        <BannerModal
          banner={editing.banner}
          placement={editing.placement}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting.open}
        onOpenChange={(open) => !open && deleting.close()}
        title={`Delete “${deleting.target?.internalName}”?`}
        description="It disappears from the website. The image stays in your library."
        confirmLabel="Delete banner"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => deleting.target && remove.mutate(deleting.target)}
      />
    </>
  );
}
