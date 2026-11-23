import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import { History, ScrollText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatDate, relativeTime } from "@/shared/lib/format";
import {
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Pagination,
  type Column,
} from "@/shared/ui";
import type {
  AuditLogPageResponse,
  AuditLogResponse,
} from "@/shared/types/api.generated";

const PAGE_SIZE = 25;

/**
 * Paged audit trail with a details drawer. The caller decides the scope
 * (one organization, or the whole platform) through `load` and `queryKey`.
 */
export function AuditLogView({
  queryKey,
  load,
  organizationName,
  filters,
  filterKey = "",
}: {
  queryKey: (params: { page: number; pageSize: number }) => QueryKey;
  load: (params: { page: number; pageSize: number }) => Promise<AuditLogPageResponse>;
  /** Adds a "Organization" column (platform audit log). */
  organizationName?: (id: number | null) => string;
  filters?: ReactNode;
  /** Changing filters resets to page 1. */
  filterKey?: string;
}) {
  const [pageState, setPageState] = useState({ page: 1, filterKey });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ page: next, filterKey });
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);

  const params = { page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKey(params),
    queryFn: () => load(params),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLogResponse>[] = [
    {
      key: "what",
      header: "Activity",
      cell: (entry) => (
        <div className="min-w-0">
          <p className="text-ink">{entry.description ?? entry.action}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-subtle">{entry.action}</p>
        </div>
      ),
    },
    {
      key: "who",
      header: "By",
      cell: (entry) => (
        <span className="text-ink-muted">{entry.userName ?? "System"}</span>
      ),
    },
    ...(organizationName
      ? [
          {
            key: "organization",
            header: "Organization",
            hideOnMobile: true,
            cell: (entry: AuditLogResponse) => (
              <span className="text-ink-muted">
                {organizationName(entry.organizationId)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "when",
      header: "When",
      cell: (entry) => (
        <time
          dateTime={entry.createdAt}
          title={formatDate(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          className="whitespace-nowrap text-ink-muted"
        >
          {relativeTime(entry.createdAt)}
        </time>
      ),
    },
  ];

  return (
    <>
      {filters && <div className="mb-4 flex flex-wrap gap-3">{filters}</div>}
      <DataTable
        caption="Audit log"
        columns={columns}
        rows={list.data?.items}
        rowKey={(entry) => entry.id}
        loading={list.isPending || list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          <EmptyState
            icon={History}
            title="Nothing recorded yet"
            description="Changes to the team, settings and organizations appear here."
          />
        }
        actions={(entry) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(entry)}>
            Details
          </Button>
        )}
        footer={
          list.data && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.meta.total}
              onPageChange={setPage}
            />
          )
        }
      />

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Activity details"
        side="right"
      >
        {selected && (
          <AuditDetails entry={selected} organizationName={organizationName} />
        )}
      </Drawer>
    </>
  );
}

function AuditDetails({
  entry,
  organizationName,
}: {
  entry: AuditLogResponse;
  organizationName?: (id: number | null) => string;
}) {
  const rows: Array<[string, ReactNode]> = [
    ["What", entry.description ?? "—"],
    ["Action", <code key="a">{entry.action}</code>],
    ["By", entry.userName ?? "System"],
    ["When", formatDate(entry.createdAt, { dateStyle: "full", timeStyle: "medium" })],
    ...(organizationName
      ? ([["Organization", organizationName(entry.organizationId)]] as Array<
          [string, ReactNode]
        >)
      : []),
    [
      "Record",
      entry.entityType
        ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId}` : ""}`
        : "—",
    ],
    ["IP address", entry.ipAddress ?? "—"],
  ];

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-3 py-2.5">
            <dt className="text-ink-subtle">{label}</dt>
            <dd className="col-span-2 break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ScrollText size={15} aria-hidden="true" /> Details
          </h3>
          <pre className="overflow-x-auto rounded-field bg-surface-muted p-3 text-xs text-ink">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
