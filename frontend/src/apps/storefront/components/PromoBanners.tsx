import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/format";
import type { HomeSlideResponse } from "@/shared/types/api.generated";

/** A banner's button: in-site paths route, https links leave the site. */
function BannerLink({ banner }: { banner: HomeSlideResponse }) {
  if (!banner.ctaLabel || !banner.ctaUrl) return null;
  const className =
    "mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1C1A17] transition-transform hover:translate-x-0.5";
  const label = (
    <>
      {banner.ctaLabel} <ArrowRight size={15} aria-hidden="true" />
    </>
  );
  return banner.ctaUrl.startsWith("/") ? (
    <Link to={banner.ctaUrl} className={className}>
      {label}
    </Link>
  ) : (
    <a href={banner.ctaUrl} className={className} rel="noopener noreferrer">
      {label}
    </a>
  );
}

/**
 * Banners for the home page strip:
 * the image with its headline and button. Several sit side by side on wide
 * screens and stack on phones.
 */
export function PromoBanners({
  banners,
  compact = false,
  className,
}: {
  banners: readonly HomeSlideResponse[];
  compact?: boolean;
  className?: string;
}) {
  if (banners.length === 0) return null;
  return (
    <ul className={cn("grid gap-4", banners.length > 1 && "md:grid-cols-2", className)}>
      {banners.map((banner, index) => (
        <li
          key={`${banner.imageUrl}-${index}`}
          className={cn(
            "relative isolate flex items-end overflow-hidden rounded-card bg-[#1C1A17] text-white",
            compact ? "min-h-36" : "min-h-52 sm:min-h-60",
          )}
        >
          <picture>
            {banner.mobileImageUrl && (
              <source media="(max-width: 640px)" srcSet={banner.mobileImageUrl} />
            )}
            <img
              src={banner.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 -z-20 size-full object-cover"
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
          />
          <div className={cn("p-5", !compact && "sm:p-7")}>
            {banner.headline && (
              <p
                className={cn(
                  "font-display font-semibold text-balance",
                  compact ? "text-xl" : "text-2xl sm:text-3xl",
                )}
              >
                {banner.headline}
              </p>
            )}
            {banner.subheadline && (
              <p className="mt-1 max-w-lg text-sm opacity-90 sm:text-base">
                {banner.subheadline}
              </p>
            )}
            <BannerLink banner={banner} />
          </div>
        </li>
      ))}
    </ul>
  );
}
