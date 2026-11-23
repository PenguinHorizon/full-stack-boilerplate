import { useQuery } from "@tanstack/react-query";
import { lazy, useLayoutEffect, useMemo, type ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { publicApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { PageSpinner } from "@/shared/ui/Spinner";
import { SiteLayout } from "./layouts/SiteLayout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SiteUnavailable } from "./pages/SiteUnavailable";
import { previewAuth, previewRequested } from "./preview";
import { SiteContext, type SiteContextValue } from "./site-context";
import { applyBrandTheme, applyFavicon, clearBrandTheme } from "./theme/brand-theme";

/*
 * Home ships with the site; every other page loads on first visit, with a
 * placeholder from SiteLayout meanwhile.
 */
function page<M, P extends object = object>(
  load: () => Promise<M>,
  pick: (module: M) => ComponentType<P>,
) {
  return lazy(async () => ({ default: pick(await load()) }));
}

const content = () => import("./pages/ContentPages");
const account = () => import("./pages/AccountPages");

const ContactPage = page(
  () => import("./pages/ContactPage"),
  (m) => m.ContactPage,
);
const FaqsPage = page(content, (m) => m.FaqsPage);
const GalleryPage = page(content, (m) => m.GalleryPage);
const ContentPage = page(content, (m) => m.ContentPage);
const CustomerSignInPage = page(account, (m) => m.CustomerSignInPage);
const CustomerRegisterPage = page(account, (m) => m.CustomerRegisterPage);
const CustomerForgotPasswordPage = page(account, (m) => m.CustomerForgotPasswordPage);
const CustomerResetPasswordPage = page(account, (m) => m.CustomerResetPasswordPage);
const AccountLayout = page(account, (m) => m.AccountLayout);

export interface StorefrontAppProps {
  slug: string;
  basename: string;
}

/**
 * One organization's public website (ADR-003). Loads the site bootstrap,
 * applies the organization's brand, then renders its routes. Optional pages
 * 404 when they have no content. Add your domain's public pages here.
 */
export default function StorefrontApp({ slug, basename }: StorefrontAppProps) {
  const preview = useMemo(() => previewRequested(slug), [slug]);
  const bootstrap = useQuery({
    queryKey: queryKeys.site(slug),
    queryFn: async () =>
      publicApi.siteBootstrap(slug, preview ? await previewAuth() : null),
  });

  const site = bootstrap.data;

  useLayoutEffect(() => {
    if (!site) return undefined;
    applyBrandTheme(site.organization.brand);
    applyFavicon(site.organization.faviconUrl ?? site.organization.logoUrl);
    document.documentElement.lang = site.organization.locale.split("-")[0] ?? "en";
    return () => clearBrandTheme();
  }, [site]);

  const context = useMemo<SiteContextValue | null>(
    () => (site ? { slug, basename, site, preview } : null),
    [slug, basename, site, preview],
  );

  // One router per site; content routes stay mounted across bootstrap refreshes.
  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            element: <SiteLayout />,
            children: [
              { index: true, element: <HomePage /> },
              { path: "about", element: <ContentPage pageKey="about" /> },
              { path: "privacy", element: <ContentPage pageKey="privacy" /> },
              { path: "terms", element: <ContentPage pageKey="terms" /> },
              { path: "faqs", element: <FaqsPage /> },
              { path: "gallery", element: <GalleryPage /> },
              { path: "contact", element: <ContactPage /> },
              { path: "account/sign-in", element: <CustomerSignInPage /> },
              { path: "account/register", element: <CustomerRegisterPage /> },
              {
                path: "account/forgot-password",
                element: <CustomerForgotPasswordPage />,
              },
              { path: "account/reset-password", element: <CustomerResetPasswordPage /> },
              { path: "account", element: <AccountLayout /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
        { basename: basename === "/" ? undefined : basename },
      ),
    [basename],
  );

  if (bootstrap.isPending) return <PageSpinner label="Loading website" />;
  if (bootstrap.isError || !context) {
    return (
      <SiteUnavailable error={bootstrap.error} onRetry={() => bootstrap.refetch()} />
    );
  }

  return (
    <SiteContext.Provider value={context}>
      <RouterProvider router={router} />
    </SiteContext.Provider>
  );
}
