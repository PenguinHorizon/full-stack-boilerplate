import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryKeys } from "@/shared/api/query";
import { useAccessibleOrganizations } from "../../access/access-context";

/**
 * Organization id → name for audit entries. Super admins can open every
 * non-archived organization, so the switcher list already has the names.
 */
export function useOrganizationNames(): (id: number | null) => string {
  const organizations = useAccessibleOrganizations();
  return useCallback(
    (id: number | null) => {
      if (id === null) return "Platform";
      return organizations.find((r) => r.id === id)?.name ?? `Organization #${id}`;
    },
    [organizations],
  );
}

/** Brand colour by organization id, for the monograms in platform lists. */
export function useOrganizationColors(): (id: number) => string | null {
  const organizations = useAccessibleOrganizations();
  return useCallback(
    (id: number) => organizations.find((r) => r.id === id)?.brandPrimaryColor ?? null,
    [organizations],
  );
}

/** Everything that lists or counts organizations. */
export function useOrganizationInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.platformOrganizations });
    void queryClient.invalidateQueries({ queryKey: queryKeys.platformDashboard });
    // Super admins can open every organization: the switcher list changes too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.myOrganizations });
  };
}
