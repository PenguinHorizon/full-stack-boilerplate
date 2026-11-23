import { organizationApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { PageHeader } from "@/shared/ui";
import { useCurrentOrganization } from "../../access/access-context";
import { AuditLogView } from "../../components/AuditLogView";

export function OrganizationAuditPage() {
  const organization = useCurrentOrganization();
  return (
    <>
      <title>{`Audit log · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Audit log"
        description={`Who changed what in ${organization.name}, newest first.`}
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Audit log" },
        ]}
      />
      <AuditLogView
        queryKey={(params) => queryKeys.organizationAudit(organization.id, params)}
        load={(params) => organizationApi.auditLogs(organization.id, params)}
      />
    </>
  );
}
