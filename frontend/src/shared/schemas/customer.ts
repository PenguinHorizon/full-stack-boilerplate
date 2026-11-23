import { z } from "zod";

/*
 * Public-website account forms, mirroring
 * backend/src/modules/customers/customers.dto.ts. Phones are checked loosely
 * here; the API reads them in the organization's country and answers a field
 * error when they aren't valid.
 */

const text = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const PHONE = /^[+\d][\d\s()-]{5,}$/;
const phone = text(30)
  .min(1, "Enter your phone number")
  .refine((value) => PHONE.test(value), "Enter a phone number, e.g. 0300 1234567");
const optionalEmail = text(255).refine(
  (value) => value === "" || z.string().email().safeParse(value).success,
  "Enter a valid email address",
);
/** At least 8 characters with a letter and a number (customer accounts). */
const password = z
  .string()
  .max(128, "Use at most 128 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
    "Use at least 8 characters with a letter and a number",
  );

/* ── Customer accounts ─────────────────────────────────────────────── */

export const customerSignInSchema = z.object({
  identifier: text(255).min(1, "Enter your phone number or email"),
  password: z.string().min(1, "Enter your password").max(128),
});
export type CustomerSignInValues = z.infer<typeof customerSignInSchema>;

export const customerRegisterSchema = z.object({
  name: text(120).min(1, "Tell us your name"),
  phone,
  email: optionalEmail,
  password,
});
export type CustomerRegisterValues = z.infer<typeof customerRegisterSchema>;

export const customerResetSchema = z
  .object({ password, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The passwords don’t match",
  });
export type CustomerResetValues = z.infer<typeof customerResetSchema>;

export const customerProfileSchema = z.object({
  name: text(120).min(1, "Tell us your name"),
  email: optionalEmail,
});
export type CustomerProfileValues = z.infer<typeof customerProfileSchema>;

export const customerPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});
export type CustomerPasswordValues = z.infer<typeof customerPasswordSchema>;
