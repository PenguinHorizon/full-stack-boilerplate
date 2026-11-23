import { Eye } from "lucide-react";
import { useSite } from "../site-context";
import { exitPreview, usePreviewStatus } from "../preview";

/** Shown while staff preview drafts; customers never see it. */
export function PreviewBar() {
  const { slug, preview } = useSite();
  const status = usePreviewStatus((state) => state.status);
  if (!preview) return null;
  return (
    <div
      role="status"
      className="relative z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-ink px-4 py-2 text-sm text-canvas"
    >
      <span className="inline-flex items-center gap-2">
        <Eye size={16} aria-hidden="true" />
        {status === "signed-out"
          ? "Preview: sign in to the admin in this browser to see drafts."
          : "Preview: you’re seeing drafts. Customers only see published content."}
      </span>
      <button
        type="button"
        onClick={() => exitPreview(slug)}
        className="rounded-full border border-canvas/40 px-3 py-0.5 font-medium hover:bg-canvas/10"
      >
        Exit preview
      </button>
    </div>
  );
}
