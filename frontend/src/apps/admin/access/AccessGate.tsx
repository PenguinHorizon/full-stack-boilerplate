import { useQuery } from "@tanstack/react-query";
import { LogOut, Store } from "lucide-react";
import type { ReactNode } from "react";
import { accessApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { useIsSuperAdmin } from "@/shared/auth/staff-session";
import { useStaffAuth } from "@/shared/auth/use-staff-auth";
import { Button, EmptyState, ErrorState, PageSpinner } from "@/shared/ui";
import { AccessContext } from "./access-context";

/**
 * Loads the organizations this user can open (with role, branch scope and
 * permissions in each) before any admin screen renders. Refreshed when the
 * window regains focus, so a changed role shows up without a reload; the API
 * applies it on the very next request regardless.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const isSuperAdmin = useIsSuperAdmin();
  const organizations = useQuery({
    queryKey: queryKeys.myOrganizations,
    queryFn: accessApi.myOrganizations,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (organizations.isPending) return <PageSpinner label="Loading your organizations" />;

  if (organizations.isError) {
    return (
      <FullPage>
        <ErrorState
          error={organizations.error}
          title="Couldn't load your organizations"
          onRetry={() => organizations.refetch()}
        />
      </FullPage>
    );
  }

  if (organizations.data.length === 0 && !isSuperAdmin) return <NoOrganizationsPage />;

  return (
    <AccessContext.Provider value={organizations.data}>{children}</AccessContext.Provider>
  );
}

function FullPage({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

/** Signed in, but not a member of any organization (and not a super admin). */
export function NoOrganizationsPage() {
  const { signOut } = useStaffAuth();
  return (
    <FullPage>
      <title>No access · Admin</title>
      <EmptyState
        icon={Store}
        title="You're not part of an organization team yet"
        description="Ask an organization owner or admin to add you to their team. You'll see their organization here as soon as they do."
        action={
          <Button variant="secondary" icon={LogOut} onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />
    </FullPage>
  );
}
