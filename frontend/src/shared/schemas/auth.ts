import { z } from "zod";

/*
 * Client-side mirrors of the backend DTO rules
 * (backend/src/common/dto/users.dto.ts, auth.dto.ts), so people learn about a
 * weak password before the round-trip, not after a 400.
 */

export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

/** Blank = "not given"; anything typed must be a valid password. */
export const optionalPasswordRule = passwordRule.or(z.literal(""));

export const emailRule = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255);

/**
 * Same pattern as the API (`PHONE_PATTERN`). Spaces, dashes and brackets are
 * accepted while typing and stripped before sending.
 */
export const phoneRule = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => value === "" || /^\+?[0-9]{7,15}$/.test(value), {
    message: "Enter 7 to 15 digits, e.g. +92 300 1234567",
  });

export const signInSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Password is required"),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email: emailRule });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** PATCH /auth/me. An empty phone clears it. */
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  phone: phoneRule,
});
export type ProfileValues = z.infer<typeof profileSchema>;
