import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  organizationApi,
  type ProfileInput,
  type SettingsInput,
} from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { useCan, useCurrentOrganization } from "../../../access/access-context";

export function useOrganizationProfile() {
  const organization = useCurrentOrganization();
  return useQuery({
    queryKey: queryKeys.organizationProfile(organization.id),
    queryFn: () => organizationApi.profile(organization.id),
  });
}

export function useOrganizationSettings() {
  const organization = useCurrentOrganization();
  return useQuery({
    queryKey: queryKeys.organizationSettings(organization.id),
    queryFn: () => organizationApi.settings(organization.id),
  });
}

/** Saves part of the profile; the switcher and dashboard pick up name/colour changes. */
export function useSaveProfile(successMessage = "Saved") {
  const organization = useCurrentOrganization();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) =>
      organizationApi.updateProfile(organization.id, body),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.organizationProfile(organization.id), profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myOrganizations });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizationDashboard(organization.id),
      });
      toast.success(successMessage);
    },
  });
}

export function useSaveSettings() {
  const organization = useCurrentOrganization();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsInput) =>
      organizationApi.updateSettings(organization.id, body),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.organizationSettings(organization.id), settings);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizationDashboard(organization.id),
      });
      toast.success("Saved");
    },
  });
}

/** Organization settings are editable by roles with `organization.update`. */
export const useCanEditOrganization = () => useCan("organization.update");
