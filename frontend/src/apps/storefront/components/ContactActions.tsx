import { MessageCircle, Phone } from "lucide-react";
import { formatPhone } from "@/shared/lib/format";
import { telHref, whatsappHref } from "@/shared/lib/links";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/shared/ui/classes";
import { cn } from "@/shared/lib/format";
import { useSite } from "../site-context";

/*
 * Call and WhatsApp actions. Each renders nothing when the organization has no
 * such number, so there are never dead buttons.
 */

export function CallButton({
  phone,
  label,
  variant = "secondary",
  size = "md",
  className,
}: {
  phone?: string | null;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { site } = useSite();
  const number = phone ?? site.organization.contact.phone;
  const href = telHref(number);
  if (!href) return null;
  return (
    <a href={href} className={buttonClasses(variant, size, className)}>
      <Phone size={size === "lg" ? 18 : 16} aria-hidden="true" />
      {label ?? formatPhone(number)}
    </a>
  );
}

export function WhatsAppButton({
  message,
  label = "WhatsApp",
  variant = "secondary",
  size = "md",
  className,
}: {
  message?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { site } = useSite();
  const href = whatsappHref(
    site.organization.contact.whatsapp,
    message ?? `Hi ${site.organization.name}, I have a question.`,
  );
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={buttonClasses(variant, size, className)}
    >
      <MessageCircle size={size === "lg" ? 18 : 16} aria-hidden="true" />
      {label}
    </a>
  );
}

/** a floating click-to-chat button when a WhatsApp number is set. */
/** `raised` lifts it above the phone cart bar. */
export function WhatsAppFab({ raised = false }: { raised?: boolean }) {
  const { site } = useSite();
  const href = whatsappHref(
    site.organization.contact.whatsapp,
    `Hi ${site.organization.name}, I'd like to ask about an order.`,
  );
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Chat with ${site.organization.name} on WhatsApp`}
      className={cn(
        "fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-overlay",
        "transition-transform duration-150 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:right-6 sm:bottom-6",
        raised ? "bottom-24" : "bottom-4",
      )}
    >
      <MessageCircle size={26} aria-hidden="true" />
    </a>
  );
}
