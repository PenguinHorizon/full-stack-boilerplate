import { ImageIcon, Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { buttonClasses } from "@/shared/ui/classes";
import { Skeleton } from "@/shared/ui/Display";
import { useSite } from "../site-context";
import { money } from "../lib/money";
import { parseRichText, type Inline } from "../lib/rich-text";

/* ── SEO ───────────────────────────────────────────────────────────── */

/**
 * Per-page title, description and Open Graph tags. React hoists
 * these into <head>; crawlers that run JavaScript read them.
 */
export function Seo({
  title,
  description,
  image,
  type = "website",
}: {
  title?: string;
  description?: string | null;
  image?: string | null;
  type?: "website" | "article" | "product";
}) {
  const { site } = useSite();
  const fullTitle = title ? `${title} · ${site.organization.name}` : site.seo.title;
  const text = description ?? site.seo.description ?? site.organization.shortDescription;
  const picture = image ?? site.organization.coverUrl ?? site.organization.logoUrl;
  const absolute = (url: string) => new URL(url, window.location.origin).toString();
  return (
    <>
      <title>{fullTitle}</title>
      {text && <meta name="description" content={text} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:site_name" content={site.organization.name} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={window.location.href.split("#")[0]} />
      {text && <meta property="og:description" content={text} />}
      {picture && <meta property="og:image" content={absolute(picture)} />}
      <link rel="canonical" href={window.location.href.split(/[?#]/)[0]} />
    </>
  );
}

/* ── Layout pieces ─────────────────────────────────────────────────── */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  id,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h2
          id={id}
          className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl"
        >
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** A content page's title band. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-surface-muted/60">
      <Container className="py-12 sm:py-16">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
          {title}
        </h1>
        {children && (
          <div className="mt-4 max-w-2xl text-lg text-ink-muted">{children}</div>
        )}
      </Container>
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-4 px-4 py-12 sm:px-6"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-card" />
      ))}
    </div>
  );
}

/** A friendly failure state with a retry. */
export function ErrorBlock({
  title = "We couldn’t load this",
  message = "Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Container className="py-20 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={buttonClasses("primary", "md", "mt-6")}
        >
          Try again
        </button>
      )}
    </Container>
  );
}

/* ── Prices ─────────────────────────────────────────────── */

/** Current price, the promotion price, and what it was. */
export function PriceTag({
  price,
  promoPrice,
  compareAtPrice,
  isFrom,
  size = "md",
}: {
  price: string;
  promoPrice?: string | null;
  compareAtPrice?: string | null;
  isFrom?: boolean;
  size?: "md" | "lg";
}) {
  const { site } = useSite();
  const { currencyCode, locale } = site.organization;
  const shown = promoPrice ?? price;
  const was = promoPrice ? price : compareAtPrice;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      {isFrom && <span className="text-xs text-ink-subtle">from</span>}
      <span
        className={cn(
          "font-semibold tabular-nums",
          size === "lg" ? "text-2xl" : "text-base",
          promoPrice ? "text-accent" : "text-ink",
        )}
      >
        {money(shown, currencyCode, locale)}
      </span>
      {was && (
        <span className="text-sm text-ink-subtle tabular-nums line-through">
          <span className="sr-only">was </span>
          {money(was, currencyCode, locale)}
        </span>
      )}
    </p>
  );
}

/** An image, or a warm brand-tinted placeholder. */
export function ImageOrMark({
  src,
  alt = "",
  name,
  className,
}: {
  src: string | null;
  alt?: string;
  name: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("size-full object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-accent-soft text-accent",
        className,
      )}
    >
      <ImageIcon size={28} strokeWidth={1.5} className="opacity-60" />
      <span className="absolute right-3 bottom-2 font-display text-4xl font-semibold opacity-15">
        {name.charAt(0)}
      </span>
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span
      role="img"
      className="inline-flex gap-0.5 text-highlight"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          aria-hidden="true"
          className={index < rating ? "fill-current" : "opacity-30"}
        />
      ))}
    </span>
  );
}

/* ── Page bodies (ADR-020) ─────────────────────────────────────────── */

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((inline, index) =>
        inline.kind === "bold" ? (
          <strong key={index} className="font-semibold text-ink">
            {inline.text}
          </strong>
        ) : inline.kind === "link" ? (
          <a
            key={index}
            href={inline.href}
            className="font-medium text-accent underline underline-offset-2"
            {...(inline.href.startsWith("https://")
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            {inline.text}
          </a>
        ) : (
          <span key={index}>{inline.text}</span>
        ),
      )}
    </>
  );
}

export function RichText({ source }: { source: string }) {
  return (
    <div className="space-y-5 text-lg leading-relaxed text-ink-muted">
      {parseRichText(source).map((block, index) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2
                key={index}
                className="pt-4 font-display text-2xl font-semibold text-ink"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="pt-2 text-lg font-semibold text-ink">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-2 pl-6 marker:text-accent">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inlines inlines={item} />
                  </li>
                ))}
              </ul>
            );
          case "p":
            return (
              <p key={index}>
                <Inlines inlines={block.inlines} />
              </p>
            );
        }
      })}
    </div>
  );
}
