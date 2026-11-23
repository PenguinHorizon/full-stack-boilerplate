import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { staffAuthApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query";
import { membershipLabel } from "@/shared/auth/access";
import { useStaffSession } from "@/shared/auth/staff-session";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatPhone } from "@/shared/lib/format";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/shared/schemas/auth";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormAlert,
  FormField,
  Input,
  PageHeader,
  Skeleton,
} from "@/shared/ui";
import { useAccessibleOrganizations } from "../access/access-context";
import { OrganizationMark } from "../components/OrganizationMark";

export function AccountPage() {
  return (
    <>
      <title>Account · Admin</title>
      <PageHeader
        title="Account & security"
        description="Your profile, sign-in details and the organizations you work with."
        breadcrumbs={[{ label: "Account" }]}
      />
      <div className="grid max-w-3xl gap-6">
        <ProfileCard />
        <PasswordCard />
        <MembershipsCard />
      </div>
    </>
  );
}

function ProfileCard() {
  const queryClient = useQueryClient();
  const updateUser = useStaffSession((s) => s.updateUser);
  const profile = useQuery({ queryKey: queryKeys.staffMe, queryFn: staffAuthApi.me });
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile.data?.name ?? "",
      phone: profile.data?.phone ? formatPhone(profile.data.phone) : "",
    },
  });

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      staffAuthApi.updateMe({ name: values.name, phone: values.phone || null }),
    onSuccess: (saved) => {
      updateUser(saved);
      queryClient.setQueryData(queryKeys.staffMe, saved);
      toast.success("Profile saved");
    },
    onError: (error) =>
      setFormError(applyServerErrors(error, setError, ["name", "phone"])),
  });

  return (
    <Card>
      <CardHeader
        title="Profile"
        description="Shown to your teams in the admin portal."
      />
      <CardBody>
        {profile.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((values) => {
              setFormError(null);
              save.mutate(values);
            })}
          >
            {formError && <FormAlert>{formError}</FormAlert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name" required error={errors.name?.message}>
                {(field) => (
                  <Input {...field} {...register("name")} autoComplete="name" />
                )}
              </FormField>
              <FormField
                label="Phone"
                error={errors.phone?.message}
                hint="Optional. Lets your team reach you."
              >
                {(field) => (
                  <Input
                    {...field}
                    {...register("phone")}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+92 300 1234567"
                  />
                )}
              </FormField>
            </div>
            <FormField
              label="Email"
              hint="Ask a platform administrator to change your email."
            >
              {(field) => (
                <Input {...field} value={profile.data.email} readOnly disabled />
              )}
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={save.isPending} disabled={!isDirty}>
                Save profile
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function PasswordCard() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const change = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      staffAuthApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      reset();
      toast.success("Password changed. Other devices have been signed out.");
    },
    onError: (error) =>
      setFormError(
        applyServerErrors(error, setError, ["currentPassword", "newPassword"], {
          "401": "currentPassword",
        }),
      ),
  });

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Changing it signs you out on every other device."
      />
      <CardBody>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            change.mutate(values);
          })}
        >
          {formError && <FormAlert>{formError}</FormAlert>}
          <FormField
            label="Current password"
            required
            error={errors.currentPassword?.message}
          >
            {(field) => (
              <Input
                {...field}
                {...register("currentPassword")}
                type="password"
                autoComplete="current-password"
              />
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="New password"
              required
              error={errors.newPassword?.message}
              hint="8+ characters, upper and lower case, and a number."
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("newPassword")}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>
            <FormField
              label="Confirm new password"
              required
              error={errors.confirmPassword?.message}
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("confirmPassword")}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={change.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

/** Read-only: owners and admins manage roles from each organization's team page. */
function MembershipsCard() {
  const isSuperAdmin = useStaffSession((s) => s.user?.isSuperAdmin === true);
  const memberships = useAccessibleOrganizations().filter((r) => r.role !== null);

  return (
    <Card>
      <CardHeader
        title="Your organizations"
        description="Your role in each organization. Owners and admins change roles from the team page."
        actions={isSuperAdmin && <Badge tone="accent">Super admin</Badge>}
      />
      <CardBody className="py-2">
        {memberships.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">
            You aren't on any organization's team. As a super admin you can still open
            every organization from the platform console.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {memberships.map((organization) => (
              <li key={organization.id} className="flex items-center gap-3 py-3">
                <OrganizationMark
                  name={organization.name}
                  color={organization.brandPrimaryColor}
                />
                <Link
                  to={`/admin/${organization.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-accent"
                >
                  {organization.name}
                </Link>
                <Badge>{membershipLabel(organization.role)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
