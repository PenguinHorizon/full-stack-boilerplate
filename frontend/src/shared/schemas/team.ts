import { z } from "zod";
import { ORGANIZATION_ROLES } from "@/shared/auth/access";
import { emailRule, optionalPasswordRule } from "./auth";

/*
 * Team member forms. Mirrors AddTeamMemberDto / UpdateTeamMemberDto
 * (backend/src/common/dto/users.dto.ts); the API re-checks every rule.
 */

const role = z.enum(ORGANIZATION_ROLES, { message: "Choose a role" });

export const addMemberSchema = z.object({
  email: emailRule,
  name: z.string().trim().min(1, "Name is required").max(255),
  role,
  /** Only used when the email has no account yet. */
  password: optionalPasswordRule,
});
export type AddMemberValues = z.infer<typeof addMemberSchema>;

export const editMemberSchema = z.object({ role, isActive: z.boolean() });
export type EditMemberValues = z.infer<typeof editMemberSchema>;
