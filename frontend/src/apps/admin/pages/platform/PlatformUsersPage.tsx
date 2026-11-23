import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { platformApi, type UpdatePlatformUserInput } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { useStaffSession } from "@/shared/auth/staff-session";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { relativeTime } from "@/shared/lib/format";
import {
  Avatar,
  Badge,
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
import type { PlatformUserResponse } from "@/shared/types/api.generated";
import { SearchInput } from "../../components/AdminBits";

const PAGE_SIZE = 20;

interface UserAction {
  key: string;
  label: string;
  icon: LucideIcon;
  title: (user: PlatformUserResponse) => string;
  description: string;
  danger?: boolean;
  /** PATCH body; absent = DELETE. */
  change?: UpdatePlatformUserInput;
}

const GRANT_SUPER_ADMIN: UserAction = {
  key: "grant",
  label: "Make super admin",
  icon: ShieldCheck,
  title: (u) => `Make ${u.name} a super admin?`,
  description:
    "They'll be able to open every organization, onboard and suspend organizations, and manage all staff accounts.",
  change: { isSuperAdmin: true },
};

const REVOKE_SUPER_ADMIN: UserAction = {
  key: "revoke",
  label: "Remove super admin",
  icon: ShieldOff,
  title: (u) => `Remove ${u.name}'s platform access?`,
  description:
    "They keep their organization memberships but lose access to the platform console straight away.",
  danger: true,
  change: { isSuperAdmin: false },
};

const DEACTIVATE: UserAction = {
  key: "deactivate",
  label: "Deactivate account",
  icon: UserX,
  title: (u) => `Deactivate ${u.name}?`,
  description:
    "They're signed out everywhere and can't sign in to any organization until reactivated.",
  danger: true,
  change: { isActive: false },
};

const REACTIVATE: UserAction = {
  key: "reactivate",
  label: "Reactivate account",
  icon: UserCheck,
  title: (u) => `Reactivate ${u.name}?`,
  description: "They can sign in again with their existing password and memberships.",
  change: { isActive: true },
};

const REMOVE: UserAction = {
  key: "remove",
  label: "Delete account",
  icon: Trash2,
  title: (u) => `Delete ${u.name}'s account?`,
  description:
    "They're signed out everywhere and lose every membership. Their history stays in the audit log.",
  danger: true,
};

export function PlatformUsersPage() {
  const queryClient = useQueryClient();
  const myUserId = useStaffSession((s) => s.user?.userId);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: "createdAt", direction: "desc" });
  const pending = useConfirmTarget<{ user: PlatformUserResponse; action: UserAction }>();

  const q = useDebouncedValue(search.trim(), 300);
  const params = {
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: `${sort.field}:${sort.direction}`,
  };
  const list = useQuery({
    queryKey: queryKeys.platformUserList(params),
    queryFn: () => platformApi.users(params),
    placeholderData: keepPreviousData,
  });

  const run = useMutation({
    mutationFn: async ({
      user,
      action,
    }: {
      user: PlatformUserResponse;
      action: UserAction;
    }): Promise<string> => {
      if (!action.change) return (await platformApi.removeUser(user.id)).message;
      await platformApi.updateUser(user.id, action.change);
      return `Updated ${user.name}`;
    },
    onSuccess: (message) => {
      toast.success(message);
      pending.close();
      void queryClient.invalidateQueries({ queryKey: queryKeys.platformUsers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platformDashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platformOrganizations });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const actionsFor = (user: PlatformUserResponse): UserAction[][] => [
    [user.isSuperAdmin ? REVOKE_SUPER_ADMIN : GRANT_SUPER_ADMIN].filter(
      (action) => action !== GRANT_SUPER_ADMIN || user.isActive,
    ),
    [user.isActive ? DEACTIVATE : REACTIVATE, REMOVE],
  ];

  const columns: Column<PlatformUserResponse>[] = [
    {
      key: "user",
      header: "Person",
      sortField: "name",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {user.name}
              {user.id === myUserId && (
                <span className="ml-1.5 text-xs font-normal text-ink-subtle">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "access",
      header: "Access",
      cell: (user) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {user.isSuperAdmin && <Badge tone="accent">Super admin</Badge>}
          <span className="text-ink-muted">
            {user.membershipsCount === 1
              ? "1 organization"
              : `${user.membershipsCount} organizations`}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (user) =>
        user.isActive ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : (
          <Badge dot>Deactivated</Badge>
        ),
    },
    {
      key: "lastLoginAt",
      header: "Last sign-in",
      sortField: "lastLoginAt",
      hideOnMobile: true,
      cell: (user) => (
        <span className="text-ink-muted">
          {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never"}
        </span>
      ),
    },
  ];

  const target = pending.target;

  return (
    <>
      <title>Staff accounts · Platform · Admin</title>
      <PageHeader
        title="Staff accounts"
        description="Everyone who can sign in to the admin portal. Accounts are created from an organization's team page or when an organization is onboarded."
        breadcrumbs={[
          { label: "Platform", to: "/admin/platform" },
          { label: "Staff accounts" },
        ]}
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search staff accounts"
          placeholder="Search name, email or code"
        />
      </div>

      <DataTable
        caption="Staff accounts"
        columns={columns}
        rows={list.data?.items}
        rowKey={(user) => user.id}
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
            icon={UsersRound}
            title={q ? `Nobody matches “${q}”` : "No staff accounts yet"}
          />
        }
        actions={(user) =>
          user.id === myUserId ? null : (
            <Menu>
              <MenuTrigger asChild>
                <IconButton
                  icon={MoreHorizontal}
                  label={`Actions for ${user.name}`}
                  size="sm"
                />
              </MenuTrigger>
              <MenuContent>
                {actionsFor(user).map((group, index) => (
                  <div key={index}>
                    {index > 0 && group.length > 0 && <MenuSeparator />}
                    {group.map((action) => (
                      <MenuItem
                        key={action.key}
                        icon={action.icon}
                        tone={action.danger ? "danger" : "default"}
                        onSelect={() => pending.ask({ user, action })}
                      >
                        {action.label}
                      </MenuItem>
                    ))}
                  </div>
                ))}
              </MenuContent>
            </Menu>
          )
        }
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

      <ConfirmDialog
        open={pending.open}
        onOpenChange={(open) => !open && pending.close()}
        tone={target?.action.danger ? "danger" : "primary"}
        title={target ? target.action.title(target.user) : ""}
        description={target?.action.description ?? ""}
        confirmLabel={target?.action.label ?? "Confirm"}
        loading={run.isPending}
        onConfirm={() => target && run.mutate(target)}
      />
    </>
  );
}
