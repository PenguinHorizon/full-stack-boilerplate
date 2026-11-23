import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Navigate, useParams } from "react-router-dom";
import { contentApi } from "@/shared/api/content";
import { queryKeys } from "@/shared/api/query";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatDate } from "@/shared/lib/format";
import { pageInput, pageSchema, type PageValues } from "@/shared/schemas/content";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormAlert,
  FormField,
  Input,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import type { AdminPageResponse, PageKey } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { ImageField } from "../../../components/media/MediaPicker";
import { UnsavedChangesPrompt } from "../../../components/UnsavedChangesPrompt";
import { storefrontPreviewHref } from "../../../lib/links";
import { useContentPage } from "./website-hooks";

const PAGE_KEYS: PageKey[] = ["about", "privacy", "terms"];

function statusBadge(page: AdminPageResponse, timeZone: string) {
  if (!page.exists) return <Badge tone="neutral">Not written yet</Badge>;
  if (page.status === "draft")
    return <Badge tone="warning">Draft · not on the website</Badge>;
  return (
    <Badge tone="success" dot>
      Published
      {page.publishedAt &&
        ` ${formatDate(page.publishedAt, { dateStyle: "medium", timeZone })}`}
    </Badge>
  );
}

function PageForm({ page }: { page: AdminPageResponse }) {
  const organization = useCurrentOrganization();
  const canManage = useCan("content.manage");
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [hero, setHero] = useState<{
    id: number;
    url: string;
    altText: string | null;
  } | null>(
    page.heroMediaId && page.heroUrl
      ? { id: page.heroMediaId, url: page.heroUrl, altText: null }
      : null,
  );
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { title: page.title, body: page.body, heroMediaId: page.heroMediaId },
  });

  const save = useMutation({
    mutationFn: ({
      values,
      status,
    }: {
      values: PageValues;
      status: "draft" | "published";
    }) => contentApi.savePage(organization.id, page.key, pageInput(values, status)),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.contentPage(organization.id, page.key), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.media(organization.id) });
      reset({ title: saved.title, body: saved.body, heroMediaId: saved.heroMediaId });
      toast.success(saved.status === "published" ? "Published" : "Draft saved");
    },
    onError: (error) =>
      setFormError(applyServerErrors(error, setError, ["title", "body", "heroMediaId"])),
  });
  const submit = (status: "draft" | "published") =>
    handleSubmit((values) => {
      setFormError(null);
      save.mutate({ values, status });
    });

  const published = page.exists && page.status === "published";
  return (
    <Card>
      <UnsavedChangesPrompt when={isDirty && !save.isPending} />
      <CardHeader
        title={page.title}
        description={statusBadge(page, organization.timezone)}
        actions={
          <a
            href={storefrontPreviewHref(organization.slug, `/${page.key}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Preview <ExternalLink size={14} aria-hidden="true" />
          </a>
        }
      />
      <form noValidate onSubmit={submit("published")}>
        <CardBody className="space-y-4">
          {formError && <FormAlert>{formError}</FormAlert>}
          <fieldset disabled={!canManage || save.isPending} className="min-w-0 space-y-4">
            <FormField label="Title" required error={errors.title?.message}>
              {(field) => <Input {...field} {...register("title")} />}
            </FormField>
            <ImageField
              label="Header image (optional)"
              aspect="wide"
              value={hero}
              disabled={!canManage}
              onChange={(asset) => {
                setHero(
                  asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null,
                );
                setValue("heroMediaId", asset?.id ?? null, { shouldDirty: true });
              }}
            />
            <FormField
              label="Text"
              error={errors.body?.message}
              hint={
                <>
                  Leave a blank line between paragraphs. <code>## Heading</code>,{" "}
                  <code>- list item</code>, <code>**bold**</code>,{" "}
                  <code>[link](https://…)</code>.
                </>
              }
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={18}
                  className="font-mono text-sm"
                  {...register("body")}
                />
              )}
            </FormField>
          </fieldset>
        </CardBody>
        {canManage && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-3">
            <Button
              variant="secondary"
              loading={save.isPending && save.variables?.status === "draft"}
              disabled={save.isPending}
              onClick={submit("draft")}
            >
              {published ? "Unpublish & save as draft" : "Save draft"}
            </Button>
            <Button
              type="submit"
              loading={save.isPending && save.variables?.status === "published"}
              disabled={save.isPending}
            >
              {published ? "Save & keep published" : "Publish"}
            </Button>
          </footer>
        )}
      </form>
    </Card>
  );
}

/** `/admin/:orgId/website/pages/:pageKey`. */
export function PageEditorPage() {
  const organization = useCurrentOrganization();
  const { pageKey } = useParams();
  const key = PAGE_KEYS.find((candidate) => candidate === pageKey);
  const page = useContentPage(organization.id, key ?? "about");
  if (!key)
    return <Navigate to={`/admin/${organization.id}/website/pages/about`} replace />;
  if (page.isPending) return <Skeleton className="h-96 w-full" />;
  if (page.isError) {
    return (
      <Card>
        <ErrorState error={page.error} onRetry={() => page.refetch()} />
      </Card>
    );
  }
  return <PageForm key={key} page={page.data} />;
}
