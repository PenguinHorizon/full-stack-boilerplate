import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Globe,
  Inbox,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { organizationApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { useStaffSession } from "@/shared/auth/staff-session";
import {
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  PageHeader,
} from "@/shared/ui";
import type { ChecklistItemResponse } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../access/access-context";
import {
  ActivityList,
  ListSkeleton,
  OrganizationStatusBadge,
  StatTile,
} from "../../components/AdminBits";
import { ORGANIZATION_STATUS } from "../../components/organization-status";
import { storefrontHref } from "../../lib/links";

/**
 * Organization dashboard: real counts (each shown only with the permission to
 * see it), the setup checklist and recent activity. Add domain KPIs here
 * as features land.
 */
export function OrganizationDashboardPage() {
  const organization = useCurrentOrganization();
  const firstName = useStaffSession((s) => s.user?.name.split(" ")[0]);
  const canAudit = useCan("audit.view");
  const dashboard = useQuery({
    queryKey: queryKeys.organizationDashboard(organization.id),
    queryFn: () => organizationApi.dashboard(organization.id),
  });

  const data = dashboard.data;
  const loading = dashboard.isPending;
  const status = data?.organization.status ?? organization.status;
  const websiteLive = status === "active" && data?.organization.websiteEnabled === true;

  return (
    <>
      <title>{`Dashboard · ${organization.name} · Admin`}</title>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {organization.name} <OrganizationStatusBadge status={status} />
          </span>
        }
        breadcrumbs={[{ label: organization.name }, { label: "Dashboard" }]}
        actions={
          <a
            href={storefrontHref(organization.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary")}
          >
            <ExternalLink size={16} aria-hidden="true" />
            View website
          </a>
        }
      />

      {status !== "active" && (
        <div
          role="status"
          className={
            status === "draft"
              ? "mb-6 rounded-card border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
              : "mb-6 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
          }
        >
          <strong className="font-semibold">{ORGANIZATION_STATUS[status].label}.</strong>{" "}
          {ORGANIZATION_STATUS[status].description}
          {status === "draft" &&
            " When the checklist below is done, a platform admin publishes it."}
        </div>
      )}

      {dashboard.isError ? (
        <Card>
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(loading || data?.counts.teamMembers !== null) && (
              <StatTile
                label="Team members"
                icon={Users}
                loading={loading}
                value={data?.counts.teamMembers}
                hint={
                  <Link
                    to={`/admin/${organization.id}/team`}
                    className="font-medium text-accent"
                  >
                    Manage team
                  </Link>
                }
              />
            )}
            {(loading || data?.counts.customers !== null) && (
              <StatTile
                label="Customers"
                icon={UserRound}
                loading={loading}
                value={data?.counts.customers}
                hint="Accounts on your website"
              />
            )}
            {(loading || data?.counts.newInquiries !== null) && (
              <StatTile
                label="New messages"
                icon={Inbox}
                loading={loading}
                value={data?.counts.newInquiries}
                hint={
                  <Link
                    to={`/admin/${organization.id}/inbox`}
                    className="font-medium text-accent"
                  >
                    Open inbox
                  </Link>
                }
              />
            )}
            <StatTile
              label="Website"
              icon={Globe}
              loading={loading}
              value={websiteLive ? "Live" : "Not live"}
              hint={websiteLive ? "Customers can visit it" : "Hidden from customers"}
            />
          </div>

          {/* grid-cols-1 (minmax(0, 1fr)) keeps long one-line rows from widening the page on phones. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {(loading || (data?.checklist.length ?? 0) > 0) && (
              <SetupChecklist
                items={data?.checklist}
                loading={loading}
                organizationId={organization.id}
              />
            )}

            {canAudit && (
              <Card>
                <CardHeader
                  title="Recent activity"
                  actions={
                    <Link
                      to={`/admin/${organization.id}/audit`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      View all
                    </Link>
                  }
                />
                <CardBody className="py-2">
                  <ActivityList entries={data?.recentActivity} loading={loading} />
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Where each step is done ("publish" is a platform admin's job). */
function checklistLink(key: ChecklistItemResponse["key"], orgId: number): string | null {
  const links: Record<ChecklistItemResponse["key"], string | null> = {
    details: `/admin/${orgId}/settings/profile`,
    logo: `/admin/${orgId}/settings/branding`,
    team: `/admin/${orgId}/team`,
    publish: null,
  };
  return links[key];
}

function SetupChecklist({
  items,
  loading,
  organizationId,
}: {
  items: ChecklistItemResponse[] | undefined;
  loading: boolean;
  organizationId: number;
}) {
  const done = items?.filter((item) => item.done).length ?? 0;
  const total = items?.length ?? 0;

  return (
    <Card>
      <CardHeader
        title="Get ready to go live"
        description={loading ? undefined : `${done} of ${total} done`}
      />
      <CardBody>
        {loading ? (
          <ListSkeleton rows={5} />
        ) : (
          <>
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full rounded-full bg-success transition-[width]"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <ul className="space-y-3">
              {items?.map((item) => {
                const href = checklistLink(item.key, organizationId);
                return (
                  <li key={item.key} className="flex items-start gap-3">
                    {item.done ? (
                      <CheckCircle2
                        size={20}
                        className="mt-0.5 shrink-0 text-success"
                        aria-label="Done"
                      />
                    ) : (
                      <Circle
                        size={20}
                        className="mt-0.5 shrink-0 text-line-strong"
                        aria-label="To do"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          item.done
                            ? "text-sm font-medium text-ink-muted line-through decoration-ink-subtle/50"
                            : "text-sm font-medium text-ink"
                        }
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-ink-subtle">{item.description}</p>
                    </div>
                    {!item.done && href && (
                      <Link
                        to={href}
                        className="shrink-0 text-sm font-medium text-accent hover:underline"
                      >
                        Start
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
