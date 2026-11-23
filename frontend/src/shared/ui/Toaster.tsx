import { Toaster as HotToaster } from "react-hot-toast";

/** Notifications, themed from the active app's tokens. */
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--app-surface)",
          color: "var(--app-ink)",
          border: "1px solid var(--app-line)",
          borderRadius: "var(--app-radius-card)",
          boxShadow: "0 12px 40px rgb(16 24 40 / 0.18)",
          fontSize: "0.875rem",
        },
        success: { iconTheme: { primary: "#15803d", secondary: "#ffffff" } },
        error: { iconTheme: { primary: "#b91c1c", secondary: "#ffffff" } },
      }}
    />
  );
}
