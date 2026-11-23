import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatPhone } from "@/shared/lib/format";
import {
  organizationProfileSchema,
  toNullable,
  type OrganizationProfileValues,
} from "@/shared/schemas/organization";
import { FormField, Input, Select, Textarea } from "@/shared/ui";
import type { OrganizationProfileResponse } from "@/shared/types/api.generated";
import { countryOptions, currencyOptions, timeZoneOptions } from "../../../lib/regions";
import {
  useCanEditOrganization,
  useOrganizationProfile,
  useSaveProfile,
} from "./settings-hooks";
import { Counter, SettingsCard, SettingsLoader } from "./SettingsKit";

const SOCIAL = [
  ["facebook", "Facebook", "https://facebook.com/your-page"],
  ["instagram", "Instagram", "https://instagram.com/your-handle"],
  ["tiktok", "TikTok", "https://tiktok.com/@your-handle"],
  ["x", "X (Twitter)", "https://x.com/your-handle"],
  ["youtube", "YouTube", "https://youtube.com/@your-channel"],
] as const;

function toValues(profile: OrganizationProfileResponse): OrganizationProfileValues {
  return {
    name: profile.name,
    tagline: profile.tagline ?? "",
    shortDescription: profile.shortDescription ?? "",
    description: profile.description ?? "",
    contactPhone: profile.contactPhone ? formatPhone(profile.contactPhone) : "",
    whatsappNumber: profile.whatsappNumber ? formatPhone(profile.whatsappNumber) : "",
    contactEmail: profile.contactEmail ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    addressLine: profile.addressLine ?? "",
    city: profile.city ?? "",
    social: {
      facebook: profile.social.facebook ?? "",
      instagram: profile.social.instagram ?? "",
      tiktok: profile.social.tiktok ?? "",
      x: profile.social.x ?? "",
      youtube: profile.social.youtube ?? "",
    },
    countryCode: profile.countryCode,
    timezone: profile.timezone,
    currencyCode: profile.currencyCode,
    locale: profile.locale,
  };
}

export function ProfileSettingsPage() {
  const profile = useOrganizationProfile();
  return (
    <SettingsLoader query={profile}>
      {(data) => <ProfileForm key={data.updatedAt} profile={data} />}
    </SettingsLoader>
  );
}

const SERVER_FIELDS = [
  "name",
  "tagline",
  "shortDescription",
  "description",
  "contactPhone",
  "whatsappNumber",
  "contactEmail",
  "websiteUrl",
  "addressLine",
  "city",
  "social.facebook",
  "social.instagram",
  "social.tiktok",
  "social.x",
  "social.youtube",
  "countryCode",
  "timezone",
  "currencyCode",
  "locale",
] as const;

function ProfileForm({ profile }: { profile: OrganizationProfileResponse }) {
  const canEdit = useCanEditOrganization();
  const save = useSaveProfile("Profile saved");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<OrganizationProfileValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: toValues(profile),
  });
  const [shortDescription, country, currency, timezone] = useWatch({
    control,
    name: ["shortDescription", "countryCode", "currencyCode", "timezone"],
  });
  const countries = useMemo(() => countryOptions(country), [country]);
  const currencies = useMemo(() => currencyOptions(currency), [currency]);
  const zones = useMemo(() => timeZoneOptions(timezone), [timezone]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    save.mutate(
      {
        name: values.name,
        tagline: toNullable(values.tagline),
        shortDescription: toNullable(values.shortDescription),
        description: toNullable(values.description),
        contactPhone: toNullable(values.contactPhone),
        whatsappNumber: toNullable(values.whatsappNumber),
        contactEmail: toNullable(values.contactEmail),
        websiteUrl: toNullable(values.websiteUrl),
        addressLine: toNullable(values.addressLine),
        city: toNullable(values.city),
        social: Object.fromEntries(
          Object.entries(values.social).map(([key, value]) => [key, toNullable(value)]),
        ),
        countryCode: values.countryCode,
        timezone: values.timezone,
        currencyCode: values.currencyCode,
        locale: values.locale,
      },
      {
        onError: (error) =>
          setFormError(applyServerErrors(error, setError, SERVER_FIELDS)),
      },
    );
  });

  /** Render function for FormField: a Select bound to one region field. */
  const select =
    (name: "countryCode" | "currencyCode" | "timezone", options: typeof zones) =>
    (field: { id: string; invalid: boolean; "aria-describedby"?: string }) => (
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <Select
            id={field.id}
            invalid={field.invalid}
            aria-describedby={field["aria-describedby"]}
            value={value}
            onValueChange={onChange}
            options={options}
            disabled={!canEdit}
          />
        )}
      />
    );

  return (
    <SettingsCard
      title="Profile & contact"
      description="Shown on your website, in the directory and in emails."
      onSubmit={onSubmit}
      saving={save.isPending}
      dirty={isDirty}
      canEdit={canEdit}
      formError={formError}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Organization name" required error={errors.name?.message}>
          {(field) => <Input {...field} {...register("name")} />}
        </FormField>
        <FormField
          label="Tagline"
          error={errors.tagline?.message}
          hint="One line under your name, e.g. “Guided journeys through the mountains”."
        >
          {(field) => <Input {...field} {...register("tagline")} />}
        </FormField>
      </div>
      <FormField
        label="Short description"
        error={errors.shortDescription?.message}
        hint={
          <>
            Used in search results and the directory ·{" "}
            <Counter value={shortDescription} max={300} />
          </>
        }
      >
        {(field) => <Textarea {...field} {...register("shortDescription")} rows={2} />}
      </FormField>
      <FormField
        label="About the business"
        error={errors.description?.message}
        hint="A few paragraphs for your About section."
      >
        {(field) => <Textarea {...field} {...register("description")} rows={5} />}
      </FormField>

      <h3 className="pt-2 text-sm font-semibold text-ink">Contact</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Phone"
          error={errors.contactPhone?.message}
          hint="Local numbers are read in your country."
        >
          {(field) => (
            <Input
              {...field}
              {...register("contactPhone")}
              type="tel"
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          label="WhatsApp"
          error={errors.whatsappNumber?.message}
          hint="Powers the “WhatsApp us” button."
        >
          {(field) => (
            <Input
              {...field}
              {...register("whatsappNumber")}
              type="tel"
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField label="Email" error={errors.contactEmail?.message}>
          {(field) => <Input {...field} {...register("contactEmail")} type="email" />}
        </FormField>
        <FormField label="Website" error={errors.websiteUrl?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("websiteUrl")}
              type="url"
              placeholder="https://"
            />
          )}
        </FormField>
        <FormField label="Address" error={errors.addressLine?.message}>
          {(field) => <Input {...field} {...register("addressLine")} />}
        </FormField>
        <FormField label="City" error={errors.city?.message}>
          {(field) => <Input {...field} {...register("city")} />}
        </FormField>
      </div>

      <h3 className="pt-2 text-sm font-semibold text-ink">Social links</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SOCIAL.map(([key, label, example]) => (
          <FormField key={key} label={label} error={errors.social?.[key]?.message}>
            {(field) => (
              <Input
                {...field}
                {...register(`social.${key}`)}
                type="url"
                placeholder={example}
              />
            )}
          </FormField>
        ))}
      </div>

      <h3 className="pt-2 text-sm font-semibold text-ink">Region</h3>
      <p className="-mt-2 text-xs text-ink-subtle">
        Opening hours use this time zone. Changing the currency doesn’t convert any
        prices.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Country" required error={errors.countryCode?.message}>
          {select("countryCode", countries)}
        </FormField>
        <FormField label="Time zone" required error={errors.timezone?.message}>
          {select("timezone", zones)}
        </FormField>
        <FormField label="Currency" required error={errors.currencyCode?.message}>
          {select("currencyCode", currencies)}
        </FormField>
        <FormField
          label="Language and region"
          required
          error={errors.locale?.message}
          hint="Formats prices and dates, e.g. en-PK."
        >
          {(field) => <Input {...field} {...register("locale")} />}
        </FormField>
      </div>
    </SettingsCard>
  );
}
