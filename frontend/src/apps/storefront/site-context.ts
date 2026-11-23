import { createContext, useContext } from "react";
import type { SiteBootstrapResponse } from "@/shared/types/api.generated";

export interface SiteContextValue {
  slug: string;
  /** Router basename: "/" on an organization host, "/s/{slug}" in path mode. */
  basename: string;
  site: SiteBootstrapResponse;
  /** Staff preview: drafts are requested too. */
  preview?: boolean;
}

export const SiteContext = createContext<SiteContextValue | null>(null);

/** The organization this storefront is rendering. */
export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite() must be used inside the storefront app");
  return value;
}
