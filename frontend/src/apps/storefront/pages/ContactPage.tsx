import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { storefrontApi } from "@/shared/api/endpoints";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatPhone } from "@/shared/lib/format";
import { mailHref, telHref } from "@/shared/lib/links";
import {
  contactInput,
  contactSchema,
  emptyContact,
  type ContactValues,
} from "@/shared/schemas/contact";
import { Button } from "@/shared/ui/Button";
import { FormAlert, FormField, Input, Textarea } from "@/shared/ui/Field";
import { Container, PageIntro, Seo } from "../components/Bits";
import { WhatsAppButton } from "../components/ContactActions";
import { useSite } from "../site-context";
import { useState } from "react";

/** The contact form (to the admin inbox and email) and how else to reach us. */
export function ContactPage() {
  const { slug, site } = useSite();
  const { organization } = site;
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContact,
  });

  const send = useMutation({
    mutationFn: (values: ContactValues) =>
      storefrontApi.sendInquiry(slug, contactInput(values)),
    onSuccess: () => reset(emptyContact),
    onError: (error) =>
      setFormError(
        applyServerErrors(error, setError, [
          "name",
          "phone",
          "email",
          "subject",
          "message",
        ]),
      ),
  });

  return (
    <>
      <Seo
        title="Contact us"
        description={`Questions, bookings or feedback for ${organization.name}.`}
      />
      <PageIntro eyebrow="Contact" title="Get in touch">
        Questions, bookings, catering or feedback: we read every message.
      </PageIntro>
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
          {send.isSuccess ? (
            <div className="py-10 text-center" role="status">
              <CheckCircle2
                size={44}
                className="mx-auto text-success"
                aria-hidden="true"
              />
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                Message sent
              </h2>
              <p className="mt-2 text-ink-muted">{send.data.message}</p>
              <Button variant="secondary" className="mt-6" onClick={() => send.reset()}>
                Send another
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-5"
              onSubmit={handleSubmit((values) => {
                setFormError(null);
                send.mutate(values);
              })}
            >
              {formError && <FormAlert>{formError}</FormAlert>}
              <FormField label="Your name" required error={errors.name?.message}>
                {(field) => (
                  <Input {...field} autoComplete="name" {...register("name")} />
                )}
              </FormField>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField label="Phone" error={errors.phone?.message}>
                  {(field) => (
                    <Input
                      {...field}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      {...register("phone")}
                    />
                  )}
                </FormField>
                <FormField
                  label="Email"
                  error={errors.email?.message}
                  hint="A phone number or an email, so we can reply."
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                    />
                  )}
                </FormField>
              </div>
              <FormField label="Subject (optional)" error={errors.subject?.message}>
                {(field) => <Input {...field} {...register("subject")} />}
              </FormField>
              <FormField label="Message" required error={errors.message?.message}>
                {(field) => <Textarea {...field} rows={6} {...register("message")} />}
              </FormField>
              {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 overflow-hidden"
              >
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register("website")}
                />
              </div>
              <Button type="submit" size="lg" loading={send.isPending}>
                Send message
              </Button>
              <p className="text-xs text-ink-subtle">
                We use your details only to reply.
                {site.navigation.pages.includes("privacy") && (
                  <>
                    {" "}
                    See our{" "}
                    <Link to="/privacy" className="underline">
                      privacy policy
                    </Link>
                    .
                  </>
                )}
              </p>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-card border border-line bg-surface p-6">
            <h2 className="font-semibold text-ink">Other ways to reach us</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {organization.contact.phone && (
                <li className="flex gap-3">
                  <Phone
                    size={18}
                    className="mt-0.5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <a
                    href={telHref(organization.contact.phone)!}
                    className="font-medium hover:underline"
                  >
                    {formatPhone(organization.contact.phone)}
                  </a>
                </li>
              )}
              {organization.contact.email && (
                <li className="flex gap-3">
                  <Mail
                    size={18}
                    className="mt-0.5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <a
                    href={mailHref(organization.contact.email)!}
                    className="break-all font-medium hover:underline"
                  >
                    {organization.contact.email}
                  </a>
                </li>
              )}
              {organization.contact.address && (
                <li className="flex gap-3">
                  <MapPin
                    size={18}
                    className="mt-0.5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>
                    {organization.contact.address}
                    {organization.contact.city && `, ${organization.contact.city}`}
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-5">
              <WhatsAppButton label="Message us on WhatsApp" />
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}
