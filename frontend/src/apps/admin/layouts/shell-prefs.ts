import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Per-browser admin layout preferences. */
export const useShellPrefs = create<{
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "admin-shell" },
  ),
);
