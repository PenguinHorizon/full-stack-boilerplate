import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import toast from "react-hot-toast";
import { teamApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import {
  assignableRoles,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type OrganizationRole,
} from "@/shared/auth/access";
import { useIsSuperAdmin } from "@/shared/auth/staff-session";
import { applyServerErrors } from "@/shared/forms/server-errors";
import {
  addMemberSchema,
  editMemberSchema,
  type AddMemberValues,
  type EditMemberValues,
} from "@/shared/schemas/team";
import { Button, FormAlert, FormField, Input, Modal, Select, Switch } from "@/shared/ui";
import type { TeamMemberResponse } from "@/shared/types/api.generated";
import { useCurrentOrganization } from "../../../access/access-context";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = add a member. */
  member: TeamMemberResponse | null;
}

export function TeamMemberModal(props: Props) {
  // Remount per member so each form starts from that member's values.
  return props.member ? (
    <EditMemberForm
      key={`${props.member.id}:${props.open}`}
      {...props}
      member={props.member}
    />
  ) : (
    <AddMemberForm key={props.open ? "open" : "closed"} {...props} />
  );
}

function useTeamInvalidation() {
  const queryClient = useQueryClient();
  const organization = useCurrentOrganization();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.team(organization.id) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizationDashboard(organization.id),
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "r", organization.id, "audit"],
    });
  };
}

function useRoleOptions(current?: OrganizationRole) {
  const organization = useCurrentOrganization();
  const isSuperAdmin = useIsSuperAdmin();
  const roles = assignableRoles(organization.role, isSuperAdmin);
  if (current && !roles.includes(current)) roles.unshift(current);
  return roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
}

/* ── Add ───────────────────────────────────────────────────────────── */

function AddMemberForm({ open, onOpenChange }: Props) {
  const organization = useCurrentOrganization();
  const invalidate = useTeamInvalidation();
  const roleOptions = useRoleOptions();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultRole = (roleOptions.find((o) => o.value === "MEMBER") ?? roleOptions[0])
    ?.value as OrganizationRole | undefined;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
      name: "",
      role: defaultRole ?? "MEMBER",
      password: "",
    },
  });

  const add = useMutation({
    mutationFn: (values: AddMemberValues) =>
      teamApi.add(organization.id, {
        email: values.email,
        name: values.name,
        role: values.role,
        ...(values.password ? { password: values.password } : {}),
      }),
    onSuccess: (member) => {
      toast.success(`${member.user.name} now has access to ${organization.name}`);
      invalidate();
      onOpenChange(false);
    },
    onError: (error) =>
      setFormError(
        applyServerErrors(error, setError, ["email", "name", "role", "password"], {
          ALREADY_MEMBER: "email",
          EMAIL_TAKEN: "email",
          PASSWORD_REQUIRED: "password",
        }),
      ),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add team member"
      description={`They'll be able to sign in and open ${organization.name} with the role you choose.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-member-form" loading={add.isPending}>
            Add member
          </Button>
        </>
      }
    >
      <form
        id="add-member-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          add.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email" required error={errors.email?.message}>
            {(field) => (
              <Input {...field} {...register("email")} type="email" autoComplete="off" />
            )}
          </FormField>
          <FormField label="Full name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register("name")} autoComplete="off" />}
          </FormField>
        </div>
        <RoleField
          control={control}
          error={errors.role?.message}
          roleOptions={roleOptions}
        />
        <FormField
          label="Password"
          error={errors.password?.message}
          hint="Only needed if this email has no account yet. Share it with them privately; they can change it after signing in."
        >
          {(field) => (
            <Input
              {...field}
              {...register("password")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}

/* ── Edit ──────────────────────────────────────────────────────────── */

function EditMemberForm({
  open,
  onOpenChange,
  member,
}: Props & { member: TeamMemberResponse }) {
  const organization = useCurrentOrganization();
  const invalidate = useTeamInvalidation();
  const roleOptions = useRoleOptions(member.role);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      role: member.role,
      isActive: member.isActive,
    },
  });

  const save = useMutation({
    mutationFn: (values: EditMemberValues) =>
      teamApi.update(organization.id, member.id, {
        role: values.role,
        isActive: values.isActive,
      }),
    onSuccess: (saved) => {
      toast.success(`Saved ${saved.user.name}`);
      invalidate();
      onOpenChange(false);
    },
    onError: (error) =>
      setFormError(applyServerErrors(error, setError, ["role", "isActive"])),
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${member.user.name}`}
      description={member.user.email}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-member-form"
            loading={save.isPending}
            disabled={!isDirty}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-member-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <RoleField
          control={control}
          error={errors.role?.message}
          roleOptions={roleOptions}
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field: { value, onChange } }) => (
            <Switch
              checked={value}
              onCheckedChange={onChange}
              label="Access to this organization"
              description={`When off, they can't open ${organization.name}. Their account and any other memberships are unaffected.`}
            />
          )}
        />
      </form>
    </Modal>
  );
}

/* ── Shared: role select ───────────────────────────────────────────── */

function RoleField({
  control,
  error,
  roleOptions,
}: {
  // Both forms share this field; the cast keeps their own types.
  control: Control<AddMemberValues> | Control<EditMemberValues>;
  error?: string;
  roleOptions: Array<{ value: OrganizationRole; label: string }>;
}) {
  const typed = control as unknown as Control<{ role: OrganizationRole }>;
  const role = useWatch({ control: typed, name: "role" });

  return (
    <FormField
      label="Role"
      required
      error={error}
      hint={role ? ROLE_DESCRIPTIONS[role] : undefined}
    >
      {(field) => (
        <Controller
          control={typed}
          name="role"
          render={({ field: { value, onChange } }) => (
            <Select
              id={field.id}
              aria-describedby={field["aria-describedby"]}
              invalid={field.invalid}
              value={value}
              onValueChange={onChange}
              options={roleOptions}
            />
          )}
        />
      )}
    </FormField>
  );
}
