import { cn } from "@/shared/lib/format";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

/** Centred spinner with an accessible status message, for whole-page waits. */
export function PageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[50vh] place-items-center text-ink-subtle">
      <Spinner size={28} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
