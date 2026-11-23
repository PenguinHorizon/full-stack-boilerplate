import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { cn, relativeTime } from "@/shared/lib/format";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/shared/ui";
import type { NotificationResponse } from "@/shared/types/api.generated";
import type { AccessibleOrganization } from "../access/access-context";

/** Where a notification leads, by type. Add a line per notification a feature sends. */
function notificationLink(item: NotificationResponse, orgId: number): string | null {
  switch (item.type) {
    case "inquiry.received":
      return `/admin/${orgId}/inbox`;
    default:
      return null;
  }
}

function useNotifications(orgId: number) {
  return useQuery({
    queryKey: queryKeys.notifications(orgId),
    queryFn: () => notificationsApi.list(orgId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

/** The staff member's notifications in this organization. */
export function NotificationBell({
  organization,
}: {
  organization: AccessibleOrganization;
}) {
  const notifications = useNotifications(organization.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications(organization.id) });
  const read = useMutation({
    mutationFn: (id: number) => notificationsApi.read(organization.id, id),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => notificationsApi.readAll(organization.id),
    onSuccess: refresh,
  });
  const unread = notifications.data?.unreadCount ?? 0;
  const items = notifications.data?.items ?? [];

  return (
    <Menu>
      {/*
       * The badge sits beside the button, not in it: inside, its "9+" would be
       * visible text missing from the button's name ("Notifications, 2400
       * unread"), which voice control users can't match (WCAG 2.5.3).
       */}
      <span className="relative inline-grid">
        <MenuTrigger asChild>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <Bell size={18} aria-hidden="true" />
          </button>
        </MenuTrigger>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.65rem] leading-4 font-bold text-white tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <MenuContent className="w-80">
        <MenuLabel>
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                className="text-xs font-medium text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </span>
        </MenuLabel>
        <MenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-ink-subtle">
            Nothing yet. New messages show up here.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.slice(0, 15).map((item) => {
              const link = notificationLink(item, organization.id);
              return (
                <MenuItem
                  key={item.id}
                  onSelect={() => {
                    if (!item.readAt) read.mutate(item.id);
                    if (link) navigate(link);
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        item.readAt ? "bg-transparent" : "bg-accent",
                      )}
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate",
                          item.readAt ? "text-ink-muted" : "font-semibold",
                        )}
                      >
                        {item.title}
                      </span>
                      {item.body && (
                        <span className="block truncate text-xs text-ink-muted">
                          {item.body}
                        </span>
                      )}
                      <span className="block text-xs text-ink-subtle">
                        {relativeTime(item.createdAt)}
                        {!item.readAt && <span className="sr-only"> · unread</span>}
                      </span>
                    </span>
                  </span>
                </MenuItem>
              );
            })}
          </div>
        )}
      </MenuContent>
    </Menu>
  );
}
