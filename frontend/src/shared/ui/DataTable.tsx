import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { Skeleton } from "./Display";
import { EmptyState, ErrorState } from "./States";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server-side sort field; makes the header a sort button. */
  sortField?: string;
  align?: "left" | "right";
  className?: string;
  /** Left out of the mobile card view. */
  hideOnMobile?: boolean;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  caption: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Trailing per-row actions (menu/buttons). */
  actions?: (row: T) => ReactNode;
  footer?: ReactNode;
}

/**
 * Accessible data table with loading / empty / error states. Below `md` it
 * renders the same rows as stacked cards, so nothing scrolls sideways on a
 * phone.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading,
  error,
  onRetry,
  empty,
  sort,
  onSortChange,
  actions,
  footer,
}: DataTableProps<T>) {
  const showSkeleton = loading && !rows?.length;
  // Mobile cards: the first column shown on phones is the card's title.
  const primary = columns.find((column) => !column.hideOnMobile);
  const rest = columns.filter((column) => column !== primary);

  let body: ReactNode;
  if (error && !rows?.length) {
    body = <ErrorState error={error} onRetry={onRetry} />;
  } else if (!showSkeleton && rows && rows.length === 0) {
    body = empty ?? <EmptyState title="Nothing here yet" />;
  }

  const toggleSort = (field: string) => {
    if (!onSortChange) return;
    const direction = sort?.field === field && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ field, direction });
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {body ?? (
        <>
          {/* Desktop / tablet: real table */}
          {/* relative: absolutely positioned children (sr-only labels) scroll with the table. */}
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="border-b border-line bg-surface-muted/60">
                <tr>
                  {columns.map((column) => {
                    const active = sort?.field === column.sortField;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort?.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cn(
                          "px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-muted uppercase",
                          column.align === "right" && "text-right",
                          column.className,
                        )}
                      >
                        {column.sortField && onSortChange ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.sortField!)}
                            className="inline-flex items-center gap-1 uppercase hover:text-ink"
                          >
                            {column.header}
                            {active &&
                              (sort?.direction === "asc" ? (
                                <ArrowUp size={12} aria-hidden="true" />
                              ) : (
                                <ArrowDown size={12} aria-hidden="true" />
                              ))}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                  {actions && (
                    <th scope="col" className="w-12 px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-line", loading && "opacity-60")}>
                {showSkeleton
                  ? Array.from({ length: 5 }, (_, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column.key} className="px-4 py-3.5">
                            <Skeleton className="h-4 w-3/4" />
                          </td>
                        ))}
                        {actions && <td />}
                      </tr>
                    ))
                  : rows?.map((row) => (
                      <tr key={rowKey(row)} className="hover:bg-surface-muted/50">
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={cn(
                              "px-4 py-3 text-ink",
                              column.align === "right" && "text-right",
                              column.className,
                            )}
                          >
                            {column.cell(row)}
                          </td>
                        ))}
                        {actions && (
                          <td className="px-2 py-2 text-right">{actions(row)}</td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-line md:hidden" aria-label={caption}>
            {showSkeleton
              ? Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="space-y-2 p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </li>
                ))
              : rows?.map((row) => (
                  <li key={rowKey(row)} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {primary && (
                        <div className="text-sm font-medium text-ink">
                          {primary.cell(row)}
                        </div>
                      )}
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        {rest
                          .filter((column) => !column.hideOnMobile)
                          .map((column) => (
                            <div key={column.key} className="contents">
                              <dt className="text-ink-subtle">{column.header}</dt>
                              <dd className="min-w-0 text-ink">{column.cell(row)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                    {actions && <div className="shrink-0">{actions(row)}</div>}
                  </li>
                ))}
          </ul>
        </>
      )}
      {footer}
    </div>
  );
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** "Showing 21–40 of 134" with previous / next. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm"
    >
      <p className="text-ink-muted">
        Showing <span className="font-medium text-ink">{first}</span>–
        <span className="font-medium text-ink">{last}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sr-only sm:hidden">Previous page</span>
        </button>
        <span className="px-2 text-ink-subtle" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sr-only sm:hidden">Next page</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
