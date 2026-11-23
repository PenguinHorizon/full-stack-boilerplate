import { Link } from "react-router-dom";
import { buttonClasses } from "@/shared/ui/classes";
import { useSite } from "../site-context";

export function NotFoundPage() {
  const { site } = useSite();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <title>{`Page not found · ${site.organization.name}`}</title>
      <p className="font-display text-7xl font-semibold text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
        This page isn't on the menu
      </h1>
      <p className="mt-3 text-ink-muted">
        The link may be old, or the page may have moved.
      </p>
      <Link to="/" className={buttonClasses("primary", "lg", "mt-8")}>
        Back to home
      </Link>
    </section>
  );
}
