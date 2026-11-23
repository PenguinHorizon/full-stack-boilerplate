import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Archive, ArchiveRestore, Inbox, Mail, MailOpen, Phone } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { inboxApi } from "@/shared/api/content";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { cn, formatDate } from "@/shared/lib/format";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
} from "@/shared/ui";
import type { InquiryResponse, InquiryStatus } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { ListSkeleton, SearchInput } from "../../../components/AdminBits";

const TABS: Array<{ key: InquiryStatus; label: string }> = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

function replyHref(inquiry: InquiryResponse, organizationName: string): string | null {
  if (!inquiry.email) return null;
  const subject = `Re: ${inquiry.subject ?? `Your message to ${organizationName}`}`;
  return `mailto:${inquiry.email}?subject=${encodeURIComponent(subject)}`;
}

/** Messages from the website's contact form. */
export function InboxPage() {
  const organization = useCurrentOrganization();
  const canManage = useCan("inquiry.manage");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<InquiryStatus>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);
  const params = { status: tab, q: q || undefined, page };
  const list = useQuery({
    queryKey: queryKeys.inboxList(organization.id, params),
    queryFn: () => inboxApi.list(organization.id, params),
    placeholderData: keepPreviousData,
  });
  const move = useMutation({
    mutationFn: ({
      inquiry,
      status,
    }: {
      inquiry: InquiryResponse;
      status: InquiryStatus;
    }) => inboxApi.update(organization.id, inquiry.id, status),
    onSuccess: (_, { status }) => {
      if (status === "archived") toast.success("Archived");
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox(organization.id) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const counts = list.data?.counts;

  let body;
  if (list.isPending) body = <ListSkeleton rows={4} />;
  else if (list.isError)
    body = <ErrorState error={list.error} onRetry={() => list.refetch()} />;
  else if (list.data.items.length === 0) {
    body = (
      <EmptyState
        icon={Inbox}
        title={
          q
            ? `No messages match “${q}”`
            : tab === "new"
              ? "No new messages"
              : "Nothing here"
        }
        description={
          tab === "new" && !q
            ? "Messages from your website's contact form arrive here."
            : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="divide-y divide-line">
        {list.data.items.map((inquiry) => {
          const reply = replyHref(inquiry, organization.name);
          return (
            <li key={inquiry.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-ink",
                      inquiry.status === "new" ? "font-semibold" : "font-medium",
                    )}
                  >
                    {inquiry.subject ?? "Message"}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {inquiry.name} ·{" "}
                    {formatDate(inquiry.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: organization.timezone,
                    })}
                  </p>
                </div>
                {inquiry.status === "new" && <Badge tone="accent">New</Badge>}
              </div>
              <p className="mt-2 text-sm whitespace-pre-line text-ink-muted">
                {inquiry.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {reply && (
                  <a
                    href={reply}
                    onClick={() =>
                      inquiry.status === "new" &&
                      canManage &&
                      move.mutate({ inquiry, status: "read" })
                    }
                    className={buttonClasses("secondary", "sm")}
                  >
                    <Mail size={14} aria-hidden="true" /> Reply to {inquiry.email}
                  </a>
                )}
                {inquiry.phone && (
                  <a
                    href={`tel:${inquiry.phone}`}
                    className={buttonClasses("secondary", "sm")}
                  >
                    <Phone size={14} aria-hidden="true" /> {inquiry.phone}
                  </a>
                )}
                {canManage && (
                  <div className="ml-auto flex gap-1">
                    {inquiry.status === "new" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={MailOpen}
                        onClick={() => move.mutate({ inquiry, status: "read" })}
                      >
                        Mark read
                      </Button>
                    )}
                    {inquiry.status === "read" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Mail}
                        onClick={() => move.mutate({ inquiry, status: "new" })}
                      >
                        Mark unread
                      </Button>
                    )}
                    {inquiry.status === "archived" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={ArchiveRestore}
                        onClick={() => move.mutate({ inquiry, status: "read" })}
                      >
                        Restore
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Archive}
                        onClick={() => move.mutate({ inquiry, status: "archived" })}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <title>{`Inbox · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Inbox"
        description="Messages sent through your website's contact page."
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Inbox" },
        ]}
      />
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <div role="tablist" aria-label="Messages" className="flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
              className={cn(
                "rounded-control px-3 py-1.5 text-sm font-medium",
                tab === key
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
              {counts && (
                <span className="ml-1.5 text-xs tabular-nums">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search messages"
          placeholder="Name, email, phone or text"
        />
      </Card>
      <Card>
        {body}
        {list.data && (
          <Pagination
            page={page}
            pageSize={20}
            total={list.data.meta.total}
            onPageChange={setPage}
          />
        )}
      </Card>
    </>
  );
}
