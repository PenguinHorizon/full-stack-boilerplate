import { lazy, type ComponentType } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { useStaffSessionBootstrap } from "@/shared/auth/use-staff-auth";
import { AccessGate } from "./access/AccessGate";
import {
  AdminHome,
  PlatformGate,
  RequirePermission,
  OrganizationGate,
  OrganizationIndex,
} from "./access/gates";
import { RequireStaff } from "./auth/RequireStaff";
import { AdminShell } from "./layouts/AdminShell";
import { AdminNotFoundPage } from "./pages/AdminNotFoundPage";
import { SettingsLayout } from "./pages/organization/settings/SettingsLayout";
import { WebsiteLayout } from "./pages/organization/website/WebsiteLayout";

/*
 * Pages load on first visit; only the shell and access gates are in the main
 * chunk. Sign-in is lazy too, so a signed-in visit never downloads the form
 * libraries unless the page it opens has a form.
 */
function page<M>(load: () => Promise<M>, pick: (module: M) => ComponentType) {
  return lazy(async () => ({ default: pick(await load()) }));
}

const SignInPage = page(
  () => import("./pages/SignInPage"),
  (m) => m.SignInPage,
);
const ForgotPasswordPage = page(
  () => import("./pages/PasswordPages"),
  (m) => m.ForgotPasswordPage,
);
const ResetPasswordPage = page(
  () => import("./pages/PasswordPages"),
  (m) => m.ResetPasswordPage,
);
const AccountPage = page(
  () => import("./pages/AccountPage"),
  (m) => m.AccountPage,
);
const PlatformAuditPage = page(
  () => import("./pages/platform/PlatformAuditPage"),
  (m) => m.PlatformAuditPage,
);
const PlatformOverviewPage = page(
  () => import("./pages/platform/PlatformOverviewPage"),
  (m) => m.PlatformOverviewPage,
);
const PlatformOrganizationsPage = page(
  () => import("./pages/platform/PlatformOrganizationsPage"),
  (m) => m.PlatformOrganizationsPage,
);
const PlatformUsersPage = page(
  () => import("./pages/platform/PlatformUsersPage"),
  (m) => m.PlatformUsersPage,
);
const OrganizationAuditPage = page(
  () => import("./pages/organization/OrganizationAuditPage"),
  (m) => m.OrganizationAuditPage,
);
const OrganizationDashboardPage = page(
  () => import("./pages/organization/OrganizationDashboardPage"),
  (m) => m.OrganizationDashboardPage,
);
const CustomerDetailPage = page(
  () => import("./pages/organization/customers/CustomerDetailPage"),
  (m) => m.CustomerDetailPage,
);
const CustomersPage = page(
  () => import("./pages/organization/customers/CustomersPage"),
  (m) => m.CustomersPage,
);
const InboxPage = page(
  () => import("./pages/organization/customers/InboxPage"),
  (m) => m.InboxPage,
);
const MediaLibraryPage = page(
  () => import("./pages/organization/media/MediaLibraryPage"),
  (m) => m.MediaLibraryPage,
);
const BrandingSettingsPage = page(
  () => import("./pages/organization/settings/BrandingSettingsPage"),
  (m) => m.BrandingSettingsPage,
);
const WebsiteSettingsPage = page(
  () => import("./pages/organization/settings/WebsiteSettingsPage"),
  (m) => m.WebsiteSettingsPage,
);
const ProfileSettingsPage = page(
  () => import("./pages/organization/settings/ProfileSettingsPage"),
  (m) => m.ProfileSettingsPage,
);
const TeamPage = page(
  () => import("./pages/organization/team/TeamPage"),
  (m) => m.TeamPage,
);
const BannersPage = page(
  () => import("./pages/organization/website/BannersPage"),
  (m) => m.BannersPage,
);
const FaqsPage = page(
  () => import("./pages/organization/website/ContentPages"),
  (m) => m.FaqsPage,
);
const GalleryPage = page(
  () => import("./pages/organization/website/ContentPages"),
  (m) => m.GalleryPage,
);
const TestimonialsPage = page(
  () => import("./pages/organization/website/ContentPages"),
  (m) => m.TestimonialsPage,
);
const HomeSectionsPage = page(
  () => import("./pages/organization/website/HomeSectionsPage"),
  (m) => m.HomeSectionsPage,
);
const PageEditorPage = page(
  () => import("./pages/organization/website/PageEditorPage"),
  (m) => m.PageEditorPage,
);

/**
 * Admin portal (ADR-004, ADR-013).
 *
 *   /admin                  → last-used organization, first membership, or platform
 *   /admin/:orgId/…           → one organization, screens filtered by permission
 *   /admin/platform/…       → super admins
 *   /admin/account          → own profile and password
 *
 * A data router (createBrowserRouter) so editors can block navigation while
 * they hold unsaved changes (useBlocker).
 */
export default function AdminApp() {
  useStaffSessionBootstrap();
  return <RouterProvider router={router} />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/admin/sign-in" element={<SignInPage />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AccessGate>
              <AdminShell />
            </AccessGate>
          </RequireStaff>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="account" element={<AccountPage />} />

        <Route path="platform" element={<PlatformGate />}>
          <Route index element={<PlatformOverviewPage />} />
          <Route path="organizations" element={<PlatformOrganizationsPage />} />
          <Route path="users" element={<PlatformUsersPage />} />
          <Route path="audit" element={<PlatformAuditPage />} />
          <Route path="*" element={<AdminNotFoundPage />} />
        </Route>

        <Route path=":orgId" element={<OrganizationGate />}>
          <Route index element={<OrganizationIndex />} />
          <Route
            path="dashboard"
            element={
              <RequirePermission permission="dashboard.view">
                <OrganizationDashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="customers"
            element={
              <RequirePermission permission="customer.view">
                <CustomersPage />
              </RequirePermission>
            }
          />
          <Route
            path="customers/:customerId"
            element={
              <RequirePermission permission="customer.view">
                <CustomerDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="inbox"
            element={
              <RequirePermission permission="inquiry.view">
                <InboxPage />
              </RequirePermission>
            }
          />
          <Route
            path="website"
            element={
              <RequirePermission permission="content.view">
                <WebsiteLayout />
              </RequirePermission>
            }
          >
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeSectionsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="faqs" element={<FaqsPage />} />
            <Route path="pages" element={<Navigate to="about" replace />} />
            <Route path="pages/:pageKey" element={<PageEditorPage />} />
            <Route path="*" element={<AdminNotFoundPage />} />
          </Route>
          <Route
            path="media"
            element={
              <RequirePermission permission="media.view">
                <MediaLibraryPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="organization.view">
                <SettingsLayout />
              </RequirePermission>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="branding" element={<BrandingSettingsPage />} />
            <Route path="website" element={<WebsiteSettingsPage />} />
            <Route path="*" element={<AdminNotFoundPage />} />
          </Route>
          <Route
            path="team"
            element={
              <RequirePermission permission="team.view">
                <TeamPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission permission="audit.view">
                <OrganizationAuditPage />
              </RequirePermission>
            }
          />
          <Route path="*" element={<AdminNotFoundPage />} />
        </Route>

        <Route path="*" element={<AdminNotFoundPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </>,
  ),
);
