import { ChevronDown, ExternalLink, Globe, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStaffSession } from "@/shared/auth/staff-session";
import { useStaffAuth } from "@/shared/auth/use-staff-auth";
import {
  Avatar,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/shared/ui";
import type { AccessibleOrganization } from "../access/access-context";
import { storefrontHref } from "../lib/links";

export function UserMenu({
  organization,
}: {
  organization: AccessibleOrganization | null;
}) {
  const user = useStaffSession((s) => s.user);
  const { signOut } = useStaffAuth();
  const navigate = useNavigate();

  return (
    <Menu>
      <MenuTrigger className="flex items-center gap-2 rounded-control py-1 pr-2 pl-1 hover:bg-surface-muted">
        <Avatar name={user?.name} src={user?.avatar} size={32} />
        <span className="hidden max-w-40 text-left md:block">
          <span className="block truncate text-sm leading-tight font-medium text-ink">
            {user?.name}
          </span>
          <span className="block truncate text-xs leading-tight text-ink-subtle">
            {user?.isSuperAdmin ? "Super admin" : user?.email}
          </span>
        </span>
        <span className="sr-only">Account menu</span>
        <ChevronDown size={16} className="text-ink-subtle" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>
          <span className="block text-sm font-medium text-ink">{user?.name}</span>
          <span className="block text-xs text-ink-subtle">{user?.email}</span>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem icon={UserRound} onSelect={() => navigate("/admin/account")}>
          Account & security
        </MenuItem>
        {organization && (
          <MenuItem
            icon={ExternalLink}
            onSelect={() =>
              window.open(storefrontHref(organization.slug), "_blank", "noopener")
            }
          >
            View {organization.name} website
          </MenuItem>
        )}
        <MenuItem icon={Globe} onSelect={() => window.open("/", "_blank", "noopener")}>
          Organization directory
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={LogOut}
          tone="danger"
          onSelect={async () => {
            await signOut();
            navigate("/admin/sign-in", { replace: true });
          }}
        >
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
