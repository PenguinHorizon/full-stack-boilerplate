import { useState } from "react";
import { platformApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { PageHeader, Select } from "@/shared/ui";
import { useAccessibleOrganizations } from "../../access/access-context";
import { AuditLogView } from "../../components/AuditLogView";
import { useOrganizationNames } from "./platform-hooks";

const ALL = "all";

export function PlatformAuditPage() {
  const organizations = useAccessibleOrganizations();
  const organizationName = useOrganizationNames();
  const [scope, setScope] = useState(ALL);
  const organizationId = scope === ALL ? undefined : Number(scope);

  return (
    <>
      <title>Audit log · Platform · Admin</title>
      <PageHeader
        title="Audit log"
        description="Everything recorded on the platform, newest first."
        breadcrumbs={[
          { label: "Platform", to: "/admin/platform" },
          { label: "Audit log" },
        ]}
      />
      <AuditLogView
        filterKey={scope}
        queryKey={(params) => queryKeys.platformAudit({ ...params, organizationId })}
        load={(params) => platformApi.auditLogs({ ...params, organizationId })}
        organizationName={organizationName}
        filters={
          <div className="w-full max-w-xs">
            <Select
              aria-label="Organization"
              value={scope}
              onValueChange={setScope}
              options={[
                { value: ALL, label: "All organizations and platform" },
                ...organizations.map((r) => ({ value: String(r.id), label: r.name })),
              ]}
            />
          </div>
        }
      />
    </>
  );
}
