import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { errorMessage } from "@/shared/api/errors";
import type { ProfileInput } from "@/shared/api/endpoints";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { brandPalette, contrastRatio, WHITE } from "@/shared/lib/color";
import { cn, initials } from "@/shared/lib/format";
import {
  brandingSchema,
  HEX_PATTERN,
  type BrandingValues,
} from "@/shared/schemas/organization";
import { Card, CardBody, CardHeader, FormField, Input } from "@/shared/ui";
import type { OrganizationProfileResponse } from "@/shared/types/api.generated";
import { ImageField } from "../../../components/media/MediaPicker";
import {
  useCanEditOrganization,
  useOrganizationProfile,
  useSaveProfile,
} from "./settings-hooks";
import { SettingsCard, SettingsLoader } from "./SettingsKit";

export function BrandingSettingsPage() {
  const profile = useOrganizationProfile();
  return (
    <SettingsLoader query={profile}>
      {(data) => (
        <>
          <ImagesCard profile={data} />
          <ColoursForm key={data.updatedAt} profile={data} />
        </>
      )}
    </SettingsLoader>
  );
}

/* ── Logo, cover, favicon ──────────────────────────────────────────── */

function ImagesCard({ profile }: { profile: OrganizationProfileResponse }) {
  const canEdit = useCanEditOrganization();
  const save = useSaveProfile("Image updated");
  const set = (body: ProfileInput) =>
    save.mutate(body, { onError: (error) => toast.error(errorMessage(error)) });

  return (
    <Card>
      <CardHeader
        title="Images"
        description="Changes are saved as soon as you pick or remove an image."
      />
      <CardBody className="space-y-6">
        <ImageField
          label="Logo"
          description="Square works best, at least 256 × 256 px. Shown in the header and the directory."
          value={profile.logo}
          disabled={!canEdit}
          onChange={(asset) => set({ logoMediaId: asset?.id ?? null })}
        />
        <ImageField
          label="Cover image"
          description="A wide photo, at least 1600 × 700 px, for the top of your home page."
          aspect="wide"
          value={profile.cover}
          disabled={!canEdit}
          onChange={(asset) => set({ coverMediaId: asset?.id ?? null })}
        />
        <ImageField
          label="Browser icon"
          description="A small square image for the browser tab. Your logo is used if you don’t set one."
          value={profile.favicon}
          disabled={!canEdit}
          onChange={(asset) => set({ faviconMediaId: asset?.id ?? null })}
        />
      </CardBody>
    </Card>
  );
}

/* ── Colours ───────────────────────────────────────────────────────── */

function ColoursForm({ profile }: { profile: OrganizationProfileResponse }) {
  const canEdit = useCanEditOrganization();
  const save = useSaveProfile("Colours saved");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandPrimaryColor: profile.brandPrimaryColor,
      brandAccentColor: profile.brandAccentColor ?? "",
    },
  });
  const [primary, accent] = useWatch({
    control,
    name: ["brandPrimaryColor", "brandAccentColor"],
  });
  const validPrimary = HEX_PATTERN.test(primary) ? primary : profile.brandPrimaryColor;
  const validAccent = HEX_PATTERN.test(accent) ? accent : null;
  const palette = brandPalette(validPrimary, validAccent);

  const colourField = (
    name: keyof BrandingValues,
    label: string,
    hint: string,
    value: string,
    fallback: string,
  ) => (
    <FormField label={label} error={errors[name]?.message} hint={hint}>
      {(field) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${label} picker`}
            value={HEX_PATTERN.test(value) ? value.toLowerCase() : fallback}
            disabled={!canEdit}
            onChange={(event) =>
              setValue(name, event.target.value.toUpperCase(), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            className="h-10 w-12 shrink-0 cursor-pointer rounded-field border border-line-strong bg-surface p-1 disabled:cursor-not-allowed"
          />
          <Input
            {...field}
            {...register(name)}
            spellCheck={false}
            placeholder="#C8553D"
            className="font-mono uppercase"
          />
        </div>
      )}
    </FormField>
  );

  return (
    <SettingsCard
      title="Colours"
      description="Your website’s buttons, links and highlights. Text colours are picked automatically to stay readable."
      onSubmit={handleSubmit((values) => {
        setFormError(null);
        save.mutate(
          {
            brandPrimaryColor: values.brandPrimaryColor.toUpperCase(),
            brandAccentColor: values.brandAccentColor
              ? values.brandAccentColor.toUpperCase()
              : null,
          },
          {
            onError: (error) =>
              setFormError(
                applyServerErrors(error, setError, [
                  "brandPrimaryColor",
                  "brandAccentColor",
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {colourField(
          "brandPrimaryColor",
          "Main colour",
          "Buttons, links and the top bar.",
          primary,
          "#c8553d",
        )}
        {colourField(
          "brandAccentColor",
          "Accent colour",
          "Badges and highlights. Leave empty for the default gold.",
          accent,
          "#e9b44c",
        )}
      </div>

      <ContrastReport
        palette={palette}
        name={profile.name}
        logoUrl={profile.logo?.url ?? null}
      />
    </SettingsCard>
  );
}

function ContrastLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        "flex items-start gap-2 text-sm",
        ok ? "text-ink-muted" : "text-warning",
      )}
    >
      {ok ? (
        <CheckCircle2
          size={16}
          className="mt-0.5 shrink-0 text-success"
          aria-hidden="true"
        />
      ) : (
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </li>
  );
}

/** WCAG checks (4.5:1 for button text, 3:1 for links on white) and a preview. */
function ContrastReport({
  palette,
  name,
  logoUrl,
}: {
  palette: ReturnType<typeof brandPalette>;
  name: string;
  logoUrl: string | null;
}) {
  const buttonRatio = contrastRatio(palette.brand, palette.brandContrast);
  const linkRatio = contrastRatio(palette.brand, WHITE);
  const fmt = (ratio: number) => `${ratio.toFixed(1)}:1`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Readability</h3>
        <ul className="space-y-2">
          <ContrastLine ok={buttonRatio >= 4.5}>
            Button text: {palette.brandContrast === WHITE ? "white" : "dark"} on your
            colour, {fmt(buttonRatio)}
            {buttonRatio >= 4.5
              ? " (meets AA)"
              : ". Below the 4.5:1 AA minimum; pick a darker or lighter shade."}
          </ContrastLine>
          <ContrastLine ok={linkRatio >= 3}>
            Links on white pages: {fmt(linkRatio)}
            {linkRatio >= 3
              ? ""
              : ". Hard to read as link text on white; a darker shade will help."}
          </ContrastLine>
        </ul>
      </div>

      <div
        aria-label="Website preview"
        role="img"
        className="overflow-hidden rounded-card border border-line"
      >
        <div className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-8 rounded-control object-contain" />
          ) : (
            <span
              className="grid size-8 place-items-center rounded-control text-xs font-semibold"
              style={{ background: palette.brand, color: palette.brandContrast }}
            >
              {initials(name)}
            </span>
          )}
          <span className="text-sm font-semibold text-[#1C1A17]">{name}</span>
          <span className="ml-auto text-xs font-medium" style={{ color: palette.brand }}>
            Menu
          </span>
        </div>
        <div className="space-y-3 px-4 py-5" style={{ background: palette.brandSoft }}>
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: palette.accent, color: palette.accentContrast }}
          >
            New
          </span>
          <p className="text-base font-semibold text-[#1C1A17]">Plan your next trip</p>
          <div className="flex gap-2">
            <span
              className="rounded-control px-3 py-1.5 text-sm font-medium"
              style={{ background: palette.brand, color: palette.brandContrast }}
            >
              Explore trips
            </span>
            <span
              className="rounded-control border bg-white px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: palette.brand, color: palette.brand }}
            >
              See menu
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
