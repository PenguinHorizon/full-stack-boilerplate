import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { KeyRound, MoreHorizontal, Pencil, Plus, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { teamApi } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { assignableRoles, canManageRole, ROLE_LABELS } from "@/shared/auth/access";
import { useIsSuperAdmin, useStaffSession } from "@/shared/auth/staff-session";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { relativeTime } from "@/shared/lib/format";
import {
  Avatar,
  Badge,
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
} from "@/shared/ui";
import type { TeamMemberResponse } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { SearchInput } from "../../../components/AdminBits";
import { TeamMemberModal } from "./TeamMemberModal";

const PAGE_SIZE = 20;

export function TeamPage() {
  const organization = useCurrentOrganization();
  const orgId = organization.id;
  const queryClient = useQueryClient();
  const myUserId = useStaffSession((s) => s.user?.userId);
  const isSuperAdmin = useIsSuperAdmin();
  const canManageTeam = useCan("team.manage");
  const canAdd =
    canManageTeam && assignableRoles(organization.role, isSuperAdmin).length > 0;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TeamMemberResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const removal = useConfirmTarget<TeamMemberResponse>();
  const reset = useConfirmTarget<TeamMemberResponse>();

  const q = useDebouncedValue(search.trim(), 300);
  const params = { q: q || undefined, page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKeys.teamList(orgId, params),
    queryFn: () => teamApi.list(orgId, params),
    placeholderData: keepPreviousData,
  });

  const afterChange = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizationDashboard(orgId),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin", "r", orgId, "audit"] });
  };

  const remove = useMutation({
    mutationFn: (member: TeamMemberResponse) => teamApi.remove(orgId, member.id),
    onSuccess: (result) => {
      toast.success(result.message);
      removal.close();
      afterChange();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const sendReset = useMutation({
    mutationFn: (member: TeamMemberResponse) =>
      teamApi.sendPasswordReset(orgId, member.id),
    onSuccess: (result) => {
      toast.success(result.message);
      reset.close();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const manageable = (member: TeamMemberResponse) =>
    canManageTeam &&
    member.user.id !== myUserId &&
    canManageRole(organization.role, member.role, isSuperAdmin);

  const openForm = (member: TeamMemberResponse | null) => {
    setEditing(member);
    setFormOpen(true);
  };

  const columns: Column<TeamMemberResponse>[] = [
    {
      key: "member",
      header: "Member",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <Avatar name={member.user.name} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {member.user.name}
              {member.user.id === myUserId && (
                <span className="ml-1.5 text-xs font-normal text-ink-subtle">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-ink-subtle">{member.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => (
        <Badge tone={member.role === "OWNER" ? "accent" : "neutral"}>
          {ROLE_LABELS[member.role]}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (member) =>
        !member.user.isActive ? (
          <Badge tone="danger" dot>
            Account disabled
          </Badge>
        ) : member.isActive ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : (
          <Badge dot>No access</Badge>
        ),
    },
    {
      key: "lastLogin",
      header: "Last sign-in",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-ink-muted">
          {member.user.lastLoginAt ? relativeTime(member.user.lastLoginAt) : "Never"}
        </span>
      ),
    },
  ];

  return (
    <>
      <title>{`Team · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Team"
        description={`People who can sign in and work on ${organization.name}.`}
        breadcrumbs={[
          { label: organization.name, to: `/admin/${orgId}` },
          { label: "Team" },
        ]}
        actions={
          canAdd && (
            <Button icon={Plus} onClick={() => openForm(null)}>
              Add member
            </Button>
          )
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          label="Search the team"
          placeholder="Search name or email"
        />
      </div>

      <DataTable
        caption="Team members"
        columns={columns}
        rows={list.data?.items}
        rowKey={(member) => member.id}
        loading={list.isPending || list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          <EmptyState
            icon={Users}
            title={q ? `Nobody matches “${q}”` : "No team members yet"}
            description={q ? "Try a different name or email." : undefined}
            action={
              !q &&
              canAdd && (
                <Button icon={Plus} onClick={() => openForm(null)}>
                  Add member
                </Button>
              )
            }
          />
        }
        actions={
          canManageTeam
            ? (member) =>
                manageable(member) ? (
                  <Menu>
                    <MenuTrigger asChild>
                      <IconButton
                        icon={MoreHorizontal}
                        label={`Actions for ${member.user.name}`}
                        size="sm"
                      />
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem icon={Pencil} onSelect={() => openForm(member)}>
                        Edit role and access
                      </MenuItem>
                      <MenuItem icon={KeyRound} onSelect={() => reset.ask(member)}>
                        Send password reset
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem
                        icon={UserMinus}
                        tone="danger"
                        onSelect={() => removal.ask(member)}
                      >
                        Remove from team
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                ) : null
            : undefined
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

      <TeamMemberModal open={formOpen} onOpenChange={setFormOpen} member={editing} />

      <ConfirmDialog
        open={removal.open}
        onOpenChange={(open) => !open && removal.close()}
        title={`Remove ${removal.target?.user.name ?? "member"} from the team?`}
        description={`They lose access to ${organization.name} straight away. Their account, and any other organizations they work with, are not affected.`}
        confirmLabel="Remove from team"
        loading={remove.isPending}
        onConfirm={() => removal.target && remove.mutate(removal.target)}
      />

      <ConfirmDialog
        open={reset.open}
        onOpenChange={(open) => !open && reset.close()}
        tone="primary"
        title="Send a password reset link?"
        description={`We'll email ${reset.target?.user.email ?? "them"} a link to choose a new password. Their current password keeps working until they do.`}
        confirmLabel="Send link"
        loading={sendReset.isPending}
        onConfirm={() => reset.target && sendReset.mutate(reset.target)}
      />
    </>
  );
}
