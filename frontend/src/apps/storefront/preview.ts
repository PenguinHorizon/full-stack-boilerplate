import { create } from "zustand";
import { refreshAccessToken } from "@/shared/api/client";
import type { PreviewAuth } from "@/shared/api/endpoints";

/*
 * Preview mode. Staff open the site with `?preview=1` (the admin's
 * "Preview" links); the tab then stays in preview until they exit, so links
 * inside the site keep showing drafts. Drafts need a staff token: we get one
 * from the admin's refresh cookie (same origin on the platform host), and the
 * API only honours it for people who may see website content.
 */

const KEY = (slug: string) => `app-preview-${slug}`;

/** Whether this tab asked for preview, from the URL or earlier in the session. */
export function previewRequested(slug: string, search = window.location.search): boolean {
  const flag = new URLSearchParams(search).get("preview");
  try {
    if (flag === "1") sessionStorage.setItem(KEY(slug), "1");
    if (flag === "0") sessionStorage.removeItem(KEY(slug));
    return sessionStorage.getItem(KEY(slug)) === "1";
  } catch {
    return flag === "1";
  }
}

type PreviewStatus = "off" | "checking" | "on" | "signed-out";

export const usePreviewStatus = create<{ status: PreviewStatus }>()(() => ({
  status: "off",
}));

/** Access tokens last 15 minutes; fetch a fresh one well before that. */
const TOKEN_AGE_MS = 10 * 60_000;
let cached: { token: string; at: number } | null = null;

/** Staff credentials for draft content, or null (not signed in to the admin here). */
export async function previewAuth(): Promise<PreviewAuth | null> {
  if (cached && Date.now() - cached.at < TOKEN_AGE_MS) return { token: cached.token };
  if (usePreviewStatus.getState().status === "off")
    usePreviewStatus.setState({ status: "checking" });
  try {
    const token = await refreshAccessToken();
    cached = { token, at: Date.now() };
    usePreviewStatus.setState({ status: "on" });
    return { token };
  } catch {
    cached = null;
    usePreviewStatus.setState({ status: "signed-out" });
    return null;
  }
}

/** Leave preview: forget it for this tab and reload the published site. */
export function exitPreview(slug: string): void {
  try {
    sessionStorage.removeItem(KEY(slug));
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("preview");
  window.location.replace(url.toString());
}
