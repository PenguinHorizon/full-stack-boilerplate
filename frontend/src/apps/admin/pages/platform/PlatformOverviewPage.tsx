import { useQuery } from "@tanstack/react-query";
import { Plus, ShieldCheck, Store, UserCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { platformApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import {
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  PageHeader,
} from "@/shared/ui";
import { ActivityList, StatTile } from "../../components/AdminBits";
import { useOrganizationNames } from "./platform-hooks";

export function PlatformOverviewPage() {
  const dashboard = useQuery({
    queryKey: queryKeys.platformDashboard,
    queryFn: platformApi.dashboard,
  });
  const organizationName = useOrganizationNames();
  const data = dashboard.data;
  const loading = dashboard.isPending;

  return (
    <>
      <title>Platform · Admin</title>
      <PageHeader
        title="Platform overview"
        description="Every organization and staff account on the platform."
        breadcrumbs={[{ label: "Platform" }]}
        actions={
          <Link
            to="/admin/platform/organizations?onboard=1"
            className={buttonClasses("primary")}
          >
            <Plus size={16} aria-hidden="true" />
            Onboard an organization
          </Link>
        }
      />

      {dashboard.isError ? (
        <Card>
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Organizations"
              icon={Store}
              loading={loading}
              value={data?.organizations.total}
              hint={
                data &&
                `${data.organizations.draft} draft · ${data.organizations.suspended} suspended · ${data.organizations.archived} archived`
              }
            />
            <StatTile
              label="Live organizations"
              icon={Store}
              loading={loading}
              value={data?.organizations.active}
              hint="Status active"
            />
            <StatTile
              label="Staff accounts"
              icon={UsersRound}
              loading={loading}
              value={data?.users.total}
              hint={data && `${data.users.inactive} deactivated`}
            />
            <StatTile
              label="Super admins"
              icon={ShieldCheck}
              loading={loading}
              value={data?.users.superAdmins}
              hint="Active platform administrators"
            />
          </div>

          <Card>
            <CardHeader
              title="Recent activity"
              description="Across the platform and every organization."
              actions={
                <Link
                  to="/admin/platform/audit"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View all
                </Link>
              }
            />
            <CardBody className="py-2">
              <ActivityList
                entries={data?.recentActivity}
                loading={loading}
                organizationName={(id) => (id === null ? null : organizationName(id))}
              />
            </CardBody>
          </Card>

          <p className="flex items-center gap-2 text-xs text-ink-subtle">
            <UserCheck size={14} aria-hidden="true" />
            Staff accounts are created when an organization is onboarded or a member is
            added to a team.
          </p>
        </div>
      )}
    </>
  );
}
