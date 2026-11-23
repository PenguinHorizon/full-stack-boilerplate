import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn, formatPhone } from "@/shared/lib/format";
import { mapsSearchHref, telHref } from "@/shared/lib/links";
import { buttonClasses } from "@/shared/ui/classes";
import type {
  HomeSectionResponse,
  HomeSlideResponse,
} from "@/shared/types/api.generated";
import {
  Container,
  ErrorBlock,
  LoadingBlock,
  SectionHeading,
  Stars,
} from "../components/Bits";
import { PromoBanners } from "../components/PromoBanners";
import { useSite } from "../site-context";
import { useHome } from "../storefront-data";

/** The home page: sections in the order staff chose, from real data. */
export function HomePage() {
  const home = useHome();
  if (home.isPending) return <LoadingBlock rows={4} />;
  if (home.isError) return <ErrorBlock onRetry={() => home.refetch()} />;
  return (
    <>
      {home.data.sections.map((section, index) => (
        <Fragment key={section.key}>
          <HomeSection section={section} />
          {/* The banner strip sits after the first section (usually the slider). */}
          {index === 0 && home.data.banners.length > 0 && (
            <Container className="pt-10 sm:pt-14">
              <PromoBanners banners={home.data.banners} />
            </Container>
          )}
        </Fragment>
      ))}
      {home.data.sections.length === 0 && home.data.banners.length > 0 && (
        <Container className="py-10">
          <PromoBanners banners={home.data.banners} />
        </Container>
      )}
    </>
  );
}

function HomeSection({ section }: { section: HomeSectionResponse }) {
  switch (section.key) {
    case "hero":
      return <Hero slides={section.slides ?? []} />;
    case "intro":
      return <Intro section={section} />;
    case "testimonials":
      return (
        <Band>
          <SectionHeading
            eyebrow="Reviews"
            title={section.title ?? "What customers say"}
            subtitle={section.subtitle}
          />
          <ul
            className={cn(
              "grid gap-5 md:grid-cols-2",
              // Four quotes sit in one row rather than three plus one.
              section.testimonials?.length === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3",
            )}
          >
            {section.testimonials?.map((item) => (
              <li key={item.id}>
                <figure className="flex h-full flex-col rounded-card border border-line bg-surface p-6">
                  {item.rating && <Stars rating={item.rating} />}
                  <blockquote className="mt-3 font-display text-lg leading-relaxed text-ink">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-auto pt-5 text-sm">
                    <span className="font-semibold text-ink">{item.authorName}</span>
                    {(item.authorDetail || item.source) && (
                      <span className="text-ink-subtle">
                        {" "}
                        ·{" "}
                        {[item.authorDetail, item.source && `via ${item.source}`]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Band>
      );
    case "gallery":
      return (
        <Band muted>
          <SectionHeading
            title={section.title ?? "Gallery"}
            subtitle={section.subtitle}
            action={<SeeAll to="/gallery" label="See more" />}
          />
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {section.gallery?.map((item) => (
              <li
                key={item.id}
                className="aspect-square overflow-hidden rounded-card bg-surface-muted"
              >
                <img
                  src={item.url}
                  alt={item.alt ?? ""}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </li>
            ))}
          </ul>
        </Band>
      );
    case "faqs":
      return (
        <Band>
          <SectionHeading
            title={section.title ?? "Questions and answers"}
            subtitle={section.subtitle}
            action={<SeeAll to="/faqs" label="All FAQs" />}
          />
          <div className="max-w-3xl space-y-8">
            {section.faqs?.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                  {group.category}
                </h3>
                <dl className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
                  {group.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="p-5">
                      <dt className="font-semibold text-ink">{item.question}</dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                        {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Band>
      );
    case "contact":
      return <ContactBand section={section} />;
    default:
      return null;
  }
}

function Band({
  muted = false,
  children,
}: {
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("py-16 sm:py-20", muted && "bg-surface-muted/60")}>
      <Container>{children}</Container>
    </section>
  );
}

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
    >
      {label} <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────── */

function Hero({ slides }: { slides: HomeSlideResponse[] }) {
  const { site } = useSite();
  const { organization } = site;
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? null;
  const image = slide?.imageUrl ?? organization.coverUrl;

  // Advance every 7 s unless the visitor prefers less motion.
  useEffect(() => {
    if (slides.length < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const headline = slide?.headline ?? organization.name;
  const sub = slide ? slide.subheadline : organization.tagline;
  const call = telHref(organization.contact.phone);

  return (
    <section className="relative isolate overflow-hidden bg-accent text-on-accent">
      {image ? (
        <>
          <picture>
            {slide?.mobileImageUrl && (
              <source media="(max-width: 640px)" srcSet={slide.mobileImageUrl} />
            )}
            <img
              src={image}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 -z-20 size-full object-cover"
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/10"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-25 [background-image:radial-gradient(circle_at_85%_20%,var(--app-highlight)_0,transparent_45%),radial-gradient(circle_at_10%_90%,rgb(0_0_0/0.35)_0,transparent_50%)]"
        />
      )}
      <Container className="py-20 sm:py-28 lg:py-32">
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {headline}
        </h1>
        {sub && (
          <p className="mt-5 max-w-xl font-display text-xl italic opacity-90 sm:text-2xl">
            {sub}
          </p>
        )}
        {!slide && organization.shortDescription && (
          <p className="mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
            {organization.shortDescription}
          </p>
        )}
        <div className="mt-9 flex flex-wrap gap-3">
          {slide?.ctaLabel && slide.ctaUrl ? (
            slide.ctaUrl.startsWith("/") ? (
              <Link to={slide.ctaUrl} className={buttonClasses("highlight", "lg")}>
                {slide.ctaLabel}
              </Link>
            ) : (
              <a href={slide.ctaUrl} className={buttonClasses("highlight", "lg")}>
                {slide.ctaLabel}
              </a>
            )
          ) : (
            <Link to="/contact" className={buttonClasses("highlight", "lg")}>
              <MessageCircle size={18} aria-hidden="true" /> Get in touch
            </Link>
          )}
          {call && (
            <a
              href={call}
              className="inline-flex h-12 items-center gap-2 rounded-control border border-current/40 px-6 text-base font-medium transition-colors hover:bg-white/10"
            >
              <Phone size={18} aria-hidden="true" />
              Call us
            </a>
          )}
        </div>
        {slides.length > 1 && (
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
              className="grid size-9 place-items-center rounded-full border border-current/40 hover:bg-white/10"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full bg-current transition-all",
                    i === index ? "w-8" : "w-3 opacity-50",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((index + 1) % slides.length)}
              className="grid size-9 place-items-center rounded-full border border-current/40 hover:bg-white/10"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}

/* ── Intro, contact ──────────────────────────────────────────────────── */

function Intro({ section }: { section: HomeSectionResponse }) {
  const { site } = useSite();
  const hasAbout = site.navigation.pages.includes("about");
  return (
    <Band>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Our story
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {section.title ?? "About us"}
          </h2>
        </div>
        <div>
          <p className="font-display text-xl leading-relaxed text-ink sm:text-2xl">
            {section.body}
          </p>
          {section.subtitle && <p className="mt-4 text-ink-muted">{section.subtitle}</p>}
          {hasAbout && (
            <Link to="/about" className={buttonClasses("secondary", "md", "mt-8")}>
              Read our story <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </Band>
  );
}

function ContactBand({ section }: { section: HomeSectionResponse }) {
  const { site } = useSite();
  const { organization } = site;
  const directions = mapsSearchHref(
    organization.contact.address,
    organization.contact.city,
  );
  return (
    <Band muted>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            title={section.title ?? "Get in touch"}
            subtitle={
              section.subtitle ??
              "Questions, plans or special requests: we're happy to help."
            }
          />
        </div>
        <div className="rounded-card border border-line bg-surface p-6">
          <h3 className="font-display text-xl font-semibold text-ink">Get in touch</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {organization.contact.address && (
              <li className="flex gap-3">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span>
                  {organization.contact.address}
                  {organization.contact.city && (
                    <span className="block text-ink-muted">
                      {organization.contact.city}
                    </span>
                  )}
                </span>
              </li>
            )}
            {organization.contact.phone && (
              <li className="flex gap-3">
                <Phone
                  size={18}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <a
                  href={telHref(organization.contact.phone)!}
                  className="font-medium hover:underline"
                >
                  {formatPhone(organization.contact.phone)}
                </a>
              </li>
            )}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses("secondary", "md")}
              >
                <MapPin size={16} aria-hidden="true" /> Directions
              </a>
            )}
            <Link to="/contact" className={buttonClasses("primary", "md")}>
              Send a message
            </Link>
          </div>
        </div>
      </div>
    </Band>
  );
}
