import type { ReactNode } from "react";

const PLATFORM_NAME = import.meta.env.VITE_PLATFORM_NAME || "Tourism Platform";

/** Centred card for sign-in, forgot and reset password. */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <title>{`${title} · ${PLATFORM_NAME} admin`}</title>
      <div className="mb-8 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-control bg-accent text-sm font-bold text-on-accent"
        >
          R
        </span>
        <span className="text-sm font-semibold text-ink">{PLATFORM_NAME}</span>
      </div>
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-sm text-ink-muted">{footer}</div>}
    </main>
  );
}
