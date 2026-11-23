import { Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { OrganizationStatus } from "@/shared/api/endpoints";
import { relativeTime } from "@/shared/lib/format";
import { Badge, Card, EmptyState, Input, Skeleton } from "@/shared/ui";
import type { AuditLogResponse } from "@/shared/types/api.generated";
import { ORGANIZATION_STATUS } from "./organization-status";

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  const { label, tone } = ORGANIZATION_STATUS[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

/** One KPI. `value` is pre-formatted so tiles can show "3 of 4" or "On". */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  loading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </Card>
  );
}

/** Compact "who did what, when" list for dashboards. */
export function ActivityList({
  entries,
  loading,
  organizationName,
}: {
  entries: AuditLogResponse[] | undefined;
  loading: boolean;
  organizationName?: (id: number | null) => string | null;
}) {
  if (loading) return <ListSkeleton />;
  if (!entries?.length) return <EmptyState title="No activity recorded yet" />;
  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => {
        const where = organizationName?.(entry.organizationId);
        return (
          <li key={entry.id} className="py-3">
            <p className="text-sm text-ink">
              {entry.description ?? `${entry.module}: ${entry.action}`}
            </p>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {entry.userName ?? "System"}
              {where && ` · ${where}`} ·{" "}
              <time dateTime={entry.createdAt}>{relativeTime(entry.createdAt)}</time>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-4 py-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

/** Search box used above admin tables. */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
