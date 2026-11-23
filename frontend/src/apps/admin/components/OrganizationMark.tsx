import { DEFAULT_BRAND, parseHex, readableOn } from "@/shared/lib/color";
import { cn, initials } from "@/shared/lib/format";

/**
 * Monogram in the organization's brand colour, so organizations are easy to tell
 * apart in the switcher. The admin keeps its own neutral theme around it.
 */
export function OrganizationMark({
  name,
  color,
  size = 28,
  className,
}: {
  name: string;
  color: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const background = parseHex(color) ? (color as string) : DEFAULT_BRAND;
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        backgroundColor: background,
        color: readableOn(background),
      }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-control font-semibold",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
