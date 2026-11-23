import { cn } from "@/shared/lib/format";

/* Class-string helpers shared by components (kept out of component files so
   React Fast Refresh keeps working). */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "highlight";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-card",
  highlight: "bg-highlight text-on-highlight hover:brightness-95 shadow-card",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-muted shadow-card",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110 shadow-card",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const BASE =
  "inline-flex select-none items-center justify-center rounded-control font-medium whitespace-nowrap " +
  "transition-[background-color,color,box-shadow,filter] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-50";

/** Class string for anything that should look like a button (links included). */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

/**
 * Square icon-only button. Kept separate from SIZES on purpose: combining
 * `px-4` with an override like `px-0` leaves the winner to stylesheet order,
 * which squeezed icons to 8px wide.
 */
export function iconButtonClasses(
  variant: ButtonVariant = "ghost",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BASE, "relative", VARIANTS[variant], ICON_SIZES[size], className);
}

const CONTROL =
  "w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle " +
  "focus-visible:outline-2 focus-visible:outline-offset-0";

export function controlClasses(invalid?: boolean, className?: string) {
  return cn(
    CONTROL,
    invalid ? "border-danger" : "border-line-strong hover:border-ink-subtle",
    className,
  );
}
