import { z } from "zod";
import type { InquiryInput } from "@/shared/api/endpoints";

/*
 * The storefront contact form, mirroring CreateInquiryDto in
 * backend/src/modules/public/storefront.dto.ts. The API also normalises the
 * phone number in the organization's country.
 */

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

export const contactSchema = z
  .object({
    name: text(120).min(1, "Tell us your name"),
    phone: text(30).refine(
      (value) => value === "" || /^[+\d][\d\s()-]{5,}$/.test(value),
      {
        message: "Enter a phone number, e.g. 0300 1234567",
      },
    ),
    email: text(255).refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      {
        message: "Enter a valid email address",
      },
    ),
    subject: text(160),
    message: text(2000).min(10, "Write at least a sentence (10 characters)"),
    /** Honeypot, hidden from people. */
    website: z.string(),
  })
  .refine((values) => values.phone !== "" || values.email !== "", {
    path: ["email"],
    message: "Leave a phone number or an email so we can reply",
  });

export type ContactValues = z.infer<typeof contactSchema>;

export const emptyContact: ContactValues = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export function contactInput(values: ContactValues): InquiryInput {
  return {
    name: values.name.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    subject: values.subject.trim() || null,
    message: values.message.trim(),
    ...(values.website ? { website: values.website } : {}),
  };
}
