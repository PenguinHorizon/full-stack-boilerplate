import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { platformApi } from "@/shared/api/endpoints";
import { applyServerErrors } from "@/shared/forms/server-errors";
import {
  editOrganizationSchema,
  onboardOrganizationSchema,
  slugify,
  type EditOrganizationValues,
  type OnboardOrganizationValues,
} from "@/shared/schemas/platform";
import { Button, FormAlert, FormField, Input, Modal } from "@/shared/ui";
import type { PlatformOrganizationResponse } from "@/shared/types/api.generated";
import { useOrganizationInvalidation } from "./platform-hooks";

function SlugPrefix() {
  return (
    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-subtle">
      /s/
    </span>
  );
}

/* ── Onboard ───────────────────────────────────────────────────────── */

export function OnboardOrganizationModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useOrganizationInvalidation();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<OnboardOrganizationValues>({
    resolver: zodResolver(onboardOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      owner: { email: "", name: "", password: "" },
    },
  });

  const close = (next: boolean) => {
    if (!next) {
      reset();
      setSlugEdited(false);
      setFormError(null);
    }
    onOpenChange(next);
  };

  const onboard = useMutation({
    mutationFn: (values: OnboardOrganizationValues) =>
      platformApi.onboardOrganization({
        name: values.name,
        slug: values.slug,
        owner: {
          email: values.owner.email,
          name: values.owner.name,
          ...(values.owner.password ? { password: values.owner.password } : {}),
        },
      }),
    onSuccess: (organization) => {
      toast.success(`${organization.name} is set up as a draft`);
      invalidate();
      close(false);
    },
    onError: (error) =>
      setFormError(
        applyServerErrors(
          error,
          setError,
          ["name", "slug", "owner.email", "owner.name", "owner.password"],
          {
            SLUG_TAKEN: "slug",
            EMAIL_TAKEN: "owner.email",
            PASSWORD_REQUIRED: "owner.password",
          },
        ),
      ),
  });

  const nameField = register("name");
  const slugField = register("slug");

  return (
    <Modal
      open={open}
      onOpenChange={close}
      size="lg"
      title="Onboard an organization"
      description="Creates the organization as a draft with its first owner. The owner finishes the setup checklist; you publish it when it's ready."
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" form="onboard-form" loading={onboard.isPending}>
            Create organization
          </Button>
        </>
      }
    >
      <form
        id="onboard-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          onboard.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}

        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold text-ink">Organization</legend>
          <FormField label="Name" required error={errors.name?.message}>
            {(field) => (
              <Input
                {...field}
                {...nameField}
                autoComplete="off"
                onChange={(event) => {
                  void nameField.onChange(event);
                  if (!slugEdited) {
                    setValue("slug", slugify(event.target.value), {
                      shouldValidate: false,
                    });
                  }
                }}
              />
            )}
          </FormField>
          <FormField
            label="Web address"
            required
            error={errors.slug?.message}
            hint="Used in links such as /s/your-organization. Lower-case letters, numbers and hyphens."
          >
            {(field) => (
              <div className="relative">
                <SlugPrefix />
                <Input
                  {...field}
                  {...slugField}
                  autoComplete="off"
                  spellCheck={false}
                  className="pl-9"
                  onChange={(event) => {
                    setSlugEdited(true);
                    void slugField.onChange(event);
                  }}
                />
              </div>
            )}
          </FormField>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold text-ink">Owner</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Email" required error={errors.owner?.email?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("owner.email")}
                  type="email"
                  autoComplete="off"
                />
              )}
            </FormField>
            <FormField label="Full name" required error={errors.owner?.name?.message}>
              {(field) => (
                <Input {...field} {...register("owner.name")} autoComplete="off" />
              )}
            </FormField>
          </div>
          <FormField
            label="Password"
            error={errors.owner?.password?.message}
            hint="Only needed if this email has no account yet. Existing accounts keep their password."
          >
            {(field) => (
              <Input
                {...field}
                {...register("owner.password")}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
        </fieldset>
      </form>
    </Modal>
  );
}

/* ── Edit name / web address ───────────────────────────────────────── */

export function EditOrganizationModal({
  organization,
  onOpenChange,
}: {
  organization: PlatformOrganizationResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  return organization ? (
    <EditOrganizationForm
      key={organization.id}
      organization={organization}
      onOpenChange={onOpenChange}
    />
  ) : null;
}

function EditOrganizationForm({
  organization,
  onOpenChange,
}: {
  organization: PlatformOrganizationResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useOrganizationInvalidation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<EditOrganizationValues>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: { name: organization.name, slug: organization.slug },
  });
  const slugChanged = useWatch({ control, name: "slug" }) !== organization.slug;

  const save = useMutation({
    mutationFn: (values: EditOrganizationValues) =>
      platformApi.updateOrganization(organization.id, values),
    onSuccess: (saved) => {
      toast.success(`Saved ${saved.name}`);
      invalidate();
      onOpenChange(false);
    },
    onError: (error) =>
      setFormError(
        applyServerErrors(error, setError, ["name", "slug"], { SLUG_TAKEN: "slug" }),
      ),
  });

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={`Edit ${organization.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-organization-form"
            loading={save.isPending}
            disabled={!isDirty}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-organization-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          save.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Name" required error={errors.name?.message}>
          {(field) => <Input {...field} {...register("name")} autoComplete="off" />}
        </FormField>
        <FormField
          label="Web address"
          required
          error={errors.slug?.message}
          hint={
            slugChanged && organization.status === "active"
              ? "This organization is live: links and QR codes using the old address will stop working."
              : undefined
          }
        >
          {(field) => (
            <div className="relative">
              <SlugPrefix />
              <Input
                {...field}
                {...register("slug")}
                autoComplete="off"
                spellCheck={false}
                className="pl-9"
              />
            </div>
          )}
        </FormField>
      </form>
    </Modal>
  );
}
