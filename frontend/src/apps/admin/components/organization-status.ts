import type { OrganizationStatus } from "@/shared/api/endpoints";
import type { BadgeTone } from "@/shared/ui";

export const ORGANIZATION_STATUS: Record<
  OrganizationStatus,
  { label: string; tone: BadgeTone; description: string }
> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    description: "Being set up. The website isn't public yet.",
  },
  active: {
    label: "Active",
    tone: "success",
    description: "Live. The website is public.",
  },
  suspended: {
    label: "Suspended",
    tone: "warning",
    description:
      "Paused by the platform. The website is offline; the team can still sign in.",
  },
  archived: {
    label: "Archived",
    tone: "danger",
    description: "Closed. Nobody but platform admins can open it.",
  },
};
