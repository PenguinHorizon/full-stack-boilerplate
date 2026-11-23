import { cn, initials } from "@/shared/lib/format";

/**
 * The organization's logo, or a typographic monogram in its brand colour until
 * a logo is uploaded.
 */
export function BrandMark({
  name,
  logoUrl,
  size = 40,
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-card object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-card bg-accent font-display font-semibold tracking-tight text-on-accent",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
