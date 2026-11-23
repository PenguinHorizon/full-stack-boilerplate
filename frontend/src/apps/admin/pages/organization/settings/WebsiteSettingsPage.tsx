import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { applyServerErrors } from "@/shared/forms/server-errors";
import {
  toNullable,
  websiteSchema,
  type WebsiteValues,
} from "@/shared/schemas/organization";
import { FormField, Input, Switch, Textarea } from "@/shared/ui";
import type { OrganizationSettingsResponse } from "@/shared/types/api.generated";
import { useCurrentOrganization } from "../../../access/access-context";
import { storefrontHref } from "../../../lib/links";
import {
  useCanEditOrganization,
  useOrganizationSettings,
  useSaveSettings,
} from "./settings-hooks";
import { Counter, SettingsCard, SettingsLoader } from "./SettingsKit";

/** A Switch bound to a boolean form field. */
function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
          label={label}
          description={description}
        />
      )}
    />
  );
}

function WithSettings({
  children,
}: {
  children: (settings: OrganizationSettingsResponse) => ReactNode;
}) {
  const settings = useOrganizationSettings();
  return <SettingsLoader query={settings}>{children}</SettingsLoader>;
}

/* ── Website & SEO ─────────────────────────────────────────────────── */

export function WebsiteSettingsPage() {
  return (
    <WithSettings>
      {(settings) => <WebsiteForm key={settings.updatedAt} settings={settings} />}
    </WithSettings>
  );
}

function WebsiteForm({ settings }: { settings: OrganizationSettingsResponse }) {
  const organization = useCurrentOrganization();
  const canEdit = useCanEditOrganization();
  const save = useSaveSettings();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<WebsiteValues>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      websiteEnabled: settings.websiteEnabled,
      customerEmailsEnabled: settings.customerEmailsEnabled,
      seoTitle: settings.seoTitle ?? "",
      seoDescription: settings.seoDescription ?? "",
      analyticsMeasurementId: settings.analyticsMeasurementId ?? "",
      footerText: settings.footerText ?? "",
    },
  });
  const [seoTitle, seoDescription] = useWatch({
    control,
    name: ["seoTitle", "seoDescription"],
  });
  const href = storefrontHref(organization.slug);

  return (
    <SettingsCard
      title="Website & SEO"
      description={
        <>
          Your website lives at{" "}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            {new URL(href, window.location.origin).host}/s/{organization.slug}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          . A platform admin can change the address.
        </>
      }
      onSubmit={handleSubmit((values) => {
        setFormError(null);
        save.mutate(
          {
            websiteEnabled: values.websiteEnabled,
            customerEmailsEnabled: values.customerEmailsEnabled,
            seoTitle: toNullable(values.seoTitle),
            seoDescription: toNullable(values.seoDescription),
            analyticsMeasurementId: toNullable(
              values.analyticsMeasurementId.toUpperCase(),
            ),
            footerText: toNullable(values.footerText),
          },
          {
            onError: (error) =>
              setFormError(
                applyServerErrors(error, setError, [
                  "seoTitle",
                  "seoDescription",
                  "analyticsMeasurementId",
                  "footerText",
                ]),
              ),
          },
        );
      })}
      saving={save.isPending}
      dirty={isDirty}
      canEdit={canEdit}
      formError={formError}
    >
      <SwitchField
        control={control}
        name="websiteEnabled"
        label="Website is on"
        description="Turn off to hide the website without suspending the account."
      />
      <SwitchField
        control={control}
        name="customerEmailsEnabled"
        label="Send customers account emails"
        description="Welcome and password-reset emails for website accounts."
      />
      <FormField
        label="Search title"
        error={errors.seoTitle?.message}
        hint={
          <>
            Shown in Google and browser tabs. Empty uses “Name — tagline” ·{" "}
            <Counter value={seoTitle} max={70} />
          </>
        }
      >
        {(field) => <Input {...field} {...register("seoTitle")} />}
      </FormField>
      <FormField
        label="Search description"
        error={errors.seoDescription?.message}
        hint={
          <>
            Empty uses your short description ·{" "}
            <Counter value={seoDescription} max={160} />
          </>
        }
      >
        {(field) => <Textarea {...field} {...register("seoDescription")} rows={2} />}
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Google Analytics ID"
          error={errors.analyticsMeasurementId?.message}
          hint="Optional, e.g. G-ABC123XYZ."
        >
          {(field) => (
            <Input
              {...field}
              {...register("analyticsMeasurementId")}
              className="uppercase"
            />
          )}
        </FormField>
      </div>
      <FormField label="Footer text" error={errors.footerText?.message}>
        {(field) => <Textarea {...field} {...register("footerText")} rows={2} />}
      </FormField>
    </SettingsCard>
  );
}
