import { Lock } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormAlert,
  Skeleton,
} from "@/shared/ui";

/**
 * One settings form: a card with its fields and a save bar. Read-only roles
 * see the same fields disabled (a native <fieldset disabled>), plus a note.
 */
export function SettingsCard({
  title,
  description,
  children,
  onSubmit,
  saving,
  dirty,
  canEdit,
  formError,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  saving: boolean;
  dirty: boolean;
  canEdit: boolean;
  formError?: string | null;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <form noValidate onSubmit={onSubmit}>
        <CardBody>
          {formError && (
            <div className="mb-4">
              <FormAlert>{formError}</FormAlert>
            </div>
          )}
          <fieldset disabled={!canEdit || saving} className="min-w-0 space-y-4">
            {children}
          </fieldset>
        </CardBody>
        <footer className="flex items-center justify-end gap-3 border-t border-line px-5 py-3">
          {canEdit ? (
            <Button type="submit" loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
              <Lock size={13} aria-hidden="true" />
              Only owners and admins can change these settings.
            </p>
          )}
        </footer>
      </form>
    </Card>
  );
}

/** Loading / error wrapper so each section only renders with data. */
export function SettingsLoader<T>({
  query,
  children,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data: T | undefined;
    refetch: () => unknown;
  };
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </CardBody>
      </Card>
    );
  }
  if (query.isError || query.data === undefined) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Card>
    );
  }
  return <>{children(query.data)}</>;
}

/** Character counter shown in field hints (SEO title, descriptions). */
export function Counter({ value, max }: { value: string; max: number }) {
  const length = value.trim().length;
  return (
    <span className={length > max ? "text-danger" : undefined}>
      {length} / {max}
    </span>
  );
}
