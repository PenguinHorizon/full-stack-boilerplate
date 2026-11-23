import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { errorMessage } from "@/shared/api/errors";
import { cn } from "@/shared/lib/format";
import { Button } from "./Button";

/*
 * Every data view handles loading → skeleton, empty → EmptyState with an
 * action, error → ErrorState with retry.
 */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-surface-muted text-ink-subtle">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-balance text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  title = "Couldn't load this",
  onRetry,
  className,
}: {
  error: unknown;
  title?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          className="mt-5"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
