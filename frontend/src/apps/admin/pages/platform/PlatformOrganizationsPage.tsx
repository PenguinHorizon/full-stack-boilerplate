import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  ExternalLink,
  LayoutDashboard,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { platformApi, type OrganizationStatus } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatDate } from "@/shared/lib/format";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  PageHeader,
  Pagination,
  useConfirmTarget,
  type Column,
  type SortState,
} from "@/shared/ui";
import type { PlatformOrganizationResponse } from "@/shared/types/api.generated";
import { OrganizationStatusBadge, SearchInput } from "../../components/AdminBits";
import { OrganizationMark } from "../../components/OrganizationMark";
import { storefrontHref } from "../../lib/links";
import { useOrganizationColors, useOrganizationInvalidation } from "./platform-hooks";
import {
  EditOrganizationModal,
  OnboardOrganizationModal,
} from "./OrganizationFormModals";

const PAGE_SIZE = 20;

interface StatusChange {
  to: OrganizationStatus;
  label: string;
  /** Toast after success: "Northern Trails is now …". */
  done: string;
  icon: LucideIcon;
  confirm: string;
  danger?: boolean;
}

/** The moves offered from each status (the API accepts any). */
const STATUS_CHANGES: Record<OrganizationStatus, StatusChange[]> = {
  draft: [
    {
      to: "active",
      label: "Publish",
      done: "live",
      icon: Play,
      confirm: "Its website goes public straight away.",
    },
  ],
  active: [
    {
      to: "suspended",
      label: "Suspend",
      done: "suspended",
      icon: Pause,
      confirm:
        "Its website goes offline. The team can still sign in and nothing is deleted.",
      danger: true,
    },
  ],
  suspended: [
    {
      to: "active",
      label: "Reactivate",
      done: "live again",
      icon: Play,
      confirm: "Its website comes back online straight away.",
    },
  ],
  archived: [
    {
      to: "draft",
      label: "Restore as draft",
      done: "a draft again",
      icon: RotateCcw,
      confirm:
        "Its team can open it again. The website stays offline until you publish it.",
    },
  ],
};

const ARCHIVE: StatusChange = {
  to: "archived",
  label: "Archive",
  done: "archived",
  icon: Archive,
  confirm:
    "Its website goes offline and its team loses access. Data is kept and it can be restored.",
  danger: true,
};

export function PlatformOrganizationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const onboardOpen = searchParams.get("onboard") === "1";
  const setOnboardOpen = (open: boolean) =>
    setSearchParams(open ? { onboard: "1" } : {}, { replace: true });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: "createdAt", direction: "desc" });
  const [editing, setEditing] = useState<PlatformOrganizationResponse | null>(null);
  const statusChange = useConfirmTarget<{
    organization: PlatformOrganizationResponse;
    change: StatusChange;
  }>();
  const invalidate = useOrganizationInvalidation();
  const colorOf = useOrganizationColors();

  const q = useDebouncedValue(search.trim(), 300);
  const params = {
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: `${sort.field}:${sort.direction}`,
  };
  const list = useQuery({
    queryKey: queryKeys.platformOrganizationList(params),
    queryFn: () => platformApi.organizations(params),
    placeholderData: keepPreviousData,
  });

  const changeStatus = useMutation({
    mutationFn: ({ organization, change }: NonNullable<typeof statusChange.target>) =>
      platformApi.updateOrganization(organization.id, { status: change.to }),
    onSuccess: (saved, { change }) => {
      toast.success(`${saved.name} is now ${change.done}`);
      statusChange.close();
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns: Column<PlatformOrganizationResponse>[] = [
    {
      key: "organization",
      header: "Organization",
      sortField: "name",
      cell: (organization) => (
        <div className="flex items-center gap-3">
          <OrganizationMark
            name={organization.name}
            color={colorOf(organization.id)}
            size={32}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{organization.name}</p>
            <p className="truncate text-xs text-ink-subtle">
              /s/{organization.slug}
              {organization.city && ` · ${organization.city}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortField: "status",
      cell: (organization) => <OrganizationStatusBadge status={organization.status} />,
    },
    {
      key: "owners",
      header: "Owner",
      cell: (organization) =>
        organization.owners.length ? (
          <div className="min-w-0">
            <p className="truncate text-ink">{organization.owners[0]?.name}</p>
            <p className="truncate text-xs text-ink-subtle">
              {organization.owners[0]?.email}
              {organization.owners.length > 1 &&
                ` +${organization.owners.length - 1} more`}
            </p>
          </div>
        ) : (
          <span className="text-ink-subtle">No owner</span>
        ),
    },
    {
      key: "team",
      header: "Team",
      align: "right",
      hideOnMobile: true,
      cell: (organization) => (
        <span className="text-ink-muted tabular-nums">{organization.membersCount}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      sortField: "createdAt",
      hideOnMobile: true,
      cell: (organization) => (
        <span className="text-ink-muted">{formatDate(organization.createdAt)}</span>
      ),
    },
  ];

  const pending = statusChange.target;

  return (
    <>
      <title>Organizations · Platform · Admin</title>
      <PageHeader
        title="Organizations"
        description="Onboard organizations, publish them, and pause or archive them."
        breadcrumbs={[
          { label: "Platform", to: "/admin/platform" },
          { label: "Organizations" },
        ]}
        actions={
          <Button icon={Plus} onClick={() => setOnboardOpen(true)}>
            Onboard an organization
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search organizations"
          placeholder="Search name, web address or city"
        />
      </div>

      <DataTable
        caption="Organizations"
        columns={columns}
        rows={list.data?.items}
        rowKey={(organization) => organization.id}
        loading={list.isPending || list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        empty={
          <EmptyState
            icon={Store}
            title={q ? `No organizations match “${q}”` : "No organizations yet"}
            action={
              !q && (
                <Button icon={Plus} onClick={() => setOnboardOpen(true)}>
                  Onboard an organization
                </Button>
              )
            }
          />
        }
        actions={(organization) => (
          <Menu>
            <MenuTrigger asChild>
              <IconButton
                icon={MoreHorizontal}
                label={`Actions for ${organization.name}`}
                size="sm"
              />
            </MenuTrigger>
            <MenuContent>
              {organization.status !== "archived" && (
                <MenuItem
                  icon={LayoutDashboard}
                  onSelect={() => navigate(`/admin/${organization.id}`)}
                >
                  Open admin
                </MenuItem>
              )}
              <MenuItem
                icon={ExternalLink}
                onSelect={() =>
                  window.open(storefrontHref(organization.slug), "_blank", "noopener")
                }
              >
                View website
              </MenuItem>
              <MenuItem icon={Pencil} onSelect={() => setEditing(organization)}>
                Edit name and web address
              </MenuItem>
              <MenuSeparator />
              {[
                ...STATUS_CHANGES[organization.status],
                ...(organization.status === "archived" ? [] : [ARCHIVE]),
              ].map((change) => (
                <MenuItem
                  key={change.to}
                  icon={change.icon}
                  tone={change.danger ? "danger" : "default"}
                  onSelect={() => statusChange.ask({ organization, change })}
                >
                  {change.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        )}
        footer={
          list.data && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.meta.total}
              onPageChange={setPage}
            />
          )
        }
      />

      <OnboardOrganizationModal open={onboardOpen} onOpenChange={setOnboardOpen} />
      <EditOrganizationModal
        organization={editing}
        onOpenChange={() => setEditing(null)}
      />

      <ConfirmDialog
        open={statusChange.open}
        onOpenChange={(open) => !open && statusChange.close()}
        tone={pending?.change.danger ? "danger" : "primary"}
        title={pending ? `${pending.change.label} ${pending.organization.name}?` : ""}
        description={pending?.change.confirm ?? ""}
        confirmLabel={pending?.change.label ?? "Confirm"}
        loading={changeStatus.isPending}
        onConfirm={() => pending && changeStatus.mutate(pending)}
      />
    </>
  );
}
