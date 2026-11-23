import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { ConfirmDialog } from "@/shared/ui";

/**
 * While `when` is true, asks before leaving: in-app navigation shows a
 * dialog, closing or reloading the tab shows the browser's own prompt.
 */
export function UnsavedChangesPrompt({ when }: { when: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when]);

  return (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      onOpenChange={(open) => !open && blocker.state === "blocked" && blocker.reset()}
      title="Leave without saving?"
      description="Your changes on this page haven’t been saved and will be lost."
      confirmLabel="Leave page"
      tone="danger"
      onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
    />
  );
}
