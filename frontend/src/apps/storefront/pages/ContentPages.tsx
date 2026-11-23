import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { isApiError } from "@/shared/api/errors";
import type { SitePageKey } from "@/shared/api/endpoints";
import { cn } from "@/shared/lib/format";
import { Modal } from "@/shared/ui/Overlay";
import type { GalleryItemResponse } from "@/shared/types/api.generated";
import {
  Container,
  ErrorBlock,
  LoadingBlock,
  PageIntro,
  RichText,
  Seo,
} from "../components/Bits";
import { firstParagraph } from "../lib/rich-text";
import { useFaqs, useGallery, useSitePage } from "../storefront-data";

const notFound = (error: unknown) => isApiError(error) && error.status === 404;

/* ── About, privacy, terms ─────────────────────────────────────────── */

export function ContentPage({ pageKey }: { pageKey: SitePageKey }) {
  const page = useSitePage(pageKey);
  if (page.isPending) return <LoadingBlock />;
  if (page.isError) {
    return notFound(page.error) ? (
      <ErrorBlock
        title="This page isn’t available"
        message="It may not have been published yet."
      />
    ) : (
      <ErrorBlock onRetry={() => page.refetch()} />
    );
  }
  const data = page.data;
  return (
    <>
      <Seo
        title={data.title}
        description={firstParagraph(data.body)}
        image={data.heroUrl}
        type="article"
      />
      {data.heroUrl ? (
        <div className="relative isolate">
          <img
            src={data.heroUrl}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden="true" />
          <Container className="py-24 text-white">
            <h1 className="font-display text-5xl font-semibold tracking-tight">
              {data.title}
            </h1>
          </Container>
        </div>
      ) : (
        <PageIntro title={data.title} />
      )}
      <Container className="max-w-3xl py-12">
        <RichText source={data.body} />
        {pageKey !== "about" && (
          <p className="mt-10 text-sm text-ink-subtle">
            Last updated{" "}
            {new Date(data.updatedAt).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </p>
        )}
      </Container>
    </>
  );
}

/* ── FAQs ──────────────────────────────────────────────────────────── */

export function FaqsPage() {
  const faqs = useFaqs();
  if (faqs.isPending) return <LoadingBlock />;
  if (faqs.isError) return <ErrorBlock onRetry={() => faqs.refetch()} />;
  return (
    <>
      <Seo title="Questions and answers" />
      <PageIntro eyebrow="Help" title="Questions and answers">
        Can’t find what you need?{" "}
        <Link to="/contact" className="font-medium text-accent underline">
          Send us a message
        </Link>
        .
      </PageIntro>
      <Container className="max-w-3xl space-y-10 py-12">
        {faqs.data.map((group) => (
          <section key={group.category} aria-labelledby={`faq-${group.category}`}>
            {faqs.data.length > 1 && (
              <h2
                id={`faq-${group.category}`}
                className="mb-3 font-display text-2xl font-semibold text-ink"
              >
                {group.category}
              </h2>
            )}
            <div className="divide-y divide-line rounded-card border border-line bg-surface">
              {group.items.map((item) => (
                <details key={item.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}

/* ── Gallery ───────────────────────────────────────────────────────── */

export function GalleryPage() {
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<GalleryItemResponse | null>(null);
  const gallery = useGallery(tag);
  if (gallery.isPending) return <LoadingBlock />;
  if (gallery.isError) return <ErrorBlock onRetry={() => gallery.refetch()} />;
  const { tags, items } = gallery.data;
  return (
    <>
      <Seo title="Gallery" />
      <PageIntro eyebrow="Gallery" title="A look inside" />
      <Container className="py-10">
        {tags.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {[null, ...tags].map((value) => (
              <button
                key={value ?? "all"}
                type="button"
                aria-pressed={tag === value}
                onClick={() => setTag(value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm",
                  tag === value
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line text-ink-muted hover:text-ink",
                )}
              >
                {value ?? "All"}
              </button>
            ))}
          </div>
        )}
        {items.length === 0 ? (
          <p className="py-12 text-center text-ink-muted">No photos here yet.</p>
        ) : (
          <ul className="columns-2 gap-4 md:columns-3 [&>li]:mb-4">
            {items.map((item) => (
              <li key={item.id} className="break-inside-avoid">
                <button
                  type="button"
                  onClick={() => setOpen(item)}
                  className="block w-full overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <img
                    src={item.url}
                    alt={item.alt ?? item.caption ?? ""}
                    loading="lazy"
                    className="w-full"
                  />
                </button>
                {item.caption && (
                  <p className="mt-1.5 text-sm text-ink-muted">{item.caption}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
      <Modal
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open?.caption ?? "Photo"}
        size="lg"
      >
        {open && (
          <img src={open.url} alt={open.alt ?? ""} className="w-full rounded-card" />
        )}
      </Modal>
    </>
  );
}
