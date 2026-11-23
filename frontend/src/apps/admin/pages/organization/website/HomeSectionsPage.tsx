import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { contentApi, type SectionInput } from "@/shared/api/content";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { cn } from "@/shared/lib/format";
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  FormAlert,
  FormField,
  Input,
  Skeleton,
  Switch,
} from "@/shared/ui";
import type { AdminSectionResponse, SectionKey } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { SortableList } from "../../../components/SortableList";
import { UnsavedChangesPrompt } from "../../../components/UnsavedChangesPrompt";
import { useSections } from "./website-hooks";

/** What each block is, where its content comes from, and how many items it shows by default. */
const SECTION_INFO: Record<
  SectionKey,
  { label: string; source: string; defaultLimit?: number }
> = {
  hero: { label: "Banner slider", source: "Your published hero banners." },
  intro: { label: "About blurb", source: "The description in Settings › Profile." },
  gallery: { label: "Gallery", source: "Published gallery photos.", defaultLimit: 8 },
  testimonials: { label: "Reviews", source: "Published reviews.", defaultLimit: 6 },
  faqs: { label: "FAQs", source: "Published questions and answers." },
  contact: {
    label: "Contact",
    source: "Phone, email and address from Settings › Profile.",
  },
};

interface Draft {
  key: SectionKey;
  isEnabled: boolean;
  title: string;
  subtitle: string;
  limit: string;
}

const toDraft = (section: AdminSectionResponse): Draft => ({
  key: section.key,
  isEnabled: section.isEnabled,
  title: section.title ?? "",
  subtitle: section.subtitle ?? "",
  limit: section.limit ? String(section.limit) : "",
});

function problems(draft: Draft): Partial<Record<"title" | "subtitle" | "limit", string>> {
  const out: Partial<Record<"title" | "subtitle" | "limit", string>> = {};
  if (draft.title.trim().length > 160) out.title = "Keep it under 160 characters";
  if (draft.subtitle.trim().length > 300) out.subtitle = "Keep it under 300 characters";
  if (draft.limit && !/^\d+$/.test(draft.limit.trim())) out.limit = "A whole number";
  else if (draft.limit && (Number(draft.limit) < 1 || Number(draft.limit) > 24))
    out.limit = "1 to 24";
  return out;
}

function SectionRow({
  draft,
  handle,
  canManage,
  showErrors,
  onChange,
}: {
  draft: Draft;
  handle: ReactNode;
  canManage: boolean;
  showErrors: boolean;
  onChange: (next: Draft) => void;
}) {
  const [open, setOpen] = useState(false);
  const info = SECTION_INFO[draft.key];
  const errors = showErrors ? problems(draft) : {};
  const hasErrors = Object.keys(errors).length > 0;
  const expanded = open || hasErrors;
  return (
    <div className={cn("bg-surface px-3 py-3", !draft.isEnabled && "opacity-70")}>
      <div className="flex items-center gap-3">
        {canManage && handle}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {info.label}
            {draft.title && (
              <span className="font-normal text-ink-subtle"> · “{draft.title}”</span>
            )}
          </p>
          <p className="text-xs text-ink-subtle">{info.source}</p>
        </div>
        <Switch
          checked={draft.isEnabled}
          disabled={!canManage}
          onCheckedChange={(on) => onChange({ ...draft, isEnabled: on })}
          label={<span className="sr-only">Show {info.label}</span>}
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Edit"} ${info.label} wording`}
          className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-surface-muted"
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>
      {expanded && (
        <fieldset
          disabled={!canManage}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_8rem] sm:pl-9"
        >
          <FormField
            label="Heading"
            error={errors.title}
            hint="Empty = the default heading"
          >
            {(field) => (
              <Input
                {...field}
                value={draft.title}
                onChange={(e) => onChange({ ...draft, title: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Subheading" error={errors.subtitle}>
            {(field) => (
              <Input
                {...field}
                value={draft.subtitle}
                onChange={(e) => onChange({ ...draft, subtitle: e.target.value })}
              />
            )}
          </FormField>
          {info.defaultLimit !== undefined && (
            <FormField
              label="Items shown"
              error={errors.limit}
              hint={`Default ${info.defaultLimit}`}
            >
              {(field) => (
                <Input
                  {...field}
                  inputMode="numeric"
                  value={draft.limit}
                  onChange={(e) => onChange({ ...draft, limit: e.target.value })}
                />
              )}
            </FormField>
          )}
        </fieldset>
      )}
    </div>
  );
}

function SectionsEditor({ sections }: { sections: AdminSectionResponse[] }) {
  const organization = useCurrentOrganization();
  const canManage = useCan("content.manage");
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(() => sections.map(toDraft));
  const [drafts, setDrafts] = useState(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = JSON.stringify(drafts) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: (body: SectionInput[]) => contentApi.saveSections(organization.id, body),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.contentKind(organization.id, "sections"), next);
      const fresh = next.map(toDraft);
      setSaved(fresh);
      setDrafts(fresh);
      setShowErrors(false);
      toast.success("Home page saved");
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const submit = () => {
    setFormError(null);
    if (drafts.some((draft) => Object.keys(problems(draft)).length > 0)) {
      setShowErrors(true);
      setFormError("Check the highlighted sections.");
      return;
    }
    save.mutate(
      drafts.map((draft) => ({
        key: draft.key,
        isEnabled: draft.isEnabled,
        title: draft.title.trim() || null,
        subtitle: draft.subtitle.trim() || null,
        limit: draft.limit.trim() ? Number(draft.limit) : null,
      })),
    );
  };

  return (
    <Card>
      <UnsavedChangesPrompt when={dirty && !save.isPending} />
      <CardHeader
        title="Home page"
        description="Drag to reorder. Sections with nothing to show are skipped automatically."
      />
      {formError && (
        <div className="px-5 pb-3">
          <FormAlert>{formError}</FormAlert>
        </div>
      )}
      <SortableList
        items={drafts}
        itemId={(draft) => draft.key}
        label={(draft) => SECTION_INFO[draft.key].label}
        disabled={!canManage || save.isPending}
        onReorder={setDrafts}
        className="divide-y divide-line border-y border-line"
        renderItem={(draft, handle) => (
          <SectionRow
            draft={draft}
            handle={handle}
            canManage={canManage}
            showErrors={showErrors}
            onChange={(next) =>
              setDrafts((all) => all.map((item) => (item.key === next.key ? next : item)))
            }
          />
        )}
      />
      {canManage && (
        <footer className="flex items-center justify-end gap-3 px-5 py-3">
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => setDrafts(saved)}
              disabled={save.isPending}
            >
              Discard
            </Button>
          )}
          <Button onClick={submit} loading={save.isPending} disabled={!dirty}>
            Save changes
          </Button>
        </footer>
      )}
    </Card>
  );
}

/** `/admin/:orgId/website/home`. */
export function HomeSectionsPage() {
  const organization = useCurrentOrganization();
  const sections = useSections(organization.id);
  if (sections.isPending) return <Skeleton className="h-96 w-full" />;
  if (sections.isError) {
    return (
      <Card>
        <ErrorState error={sections.error} onRetry={() => sections.refetch()} />
      </Card>
    );
  }
  return <SectionsEditor sections={sections.data} />;
}
