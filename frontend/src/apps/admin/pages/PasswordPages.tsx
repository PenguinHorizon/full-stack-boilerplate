import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { staffAuthApi } from "@/shared/api/endpoints";
import { errorMessage } from "@/shared/api/errors";
import { applyServerErrors } from "@/shared/forms/server-errors";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/shared/schemas/auth";
import { Button, FormAlert, FormField, Input, buttonClasses } from "@/shared/ui";
import { AuthLayout } from "../layouts/AuthLayout";

const backToSignIn = (
  <Link to="/admin/sign-in" className="font-medium text-accent hover:underline">
    Back to sign in
  </Link>
);

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await staffAuthApi.forgotPassword(values);
      setSent(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (sent) {
    return (
      <AuthLayout title="Check your email" footer={backToSignIn}>
        <div className="flex gap-3 text-sm text-ink-muted">
          <MailCheck size={20} className="shrink-0 text-success" aria-hidden="true" />
          <p>
            If that address belongs to an account, a reset link is on its way. The link
            expires in one hour.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your account email and we'll send you a reset link."
      footer={backToSignIn}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <Input {...field} {...register("email")} type="email" autoComplete="email" />
          )}
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <AuthLayout title="Link not valid" footer={backToSignIn}>
        <p className="text-sm text-ink-muted">
          This reset link is incomplete. Request a new one from the{" "}
          <Link
            to="/admin/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            forgot password
          </Link>{" "}
          page.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <p className="text-sm text-ink-muted">
          You can now sign in with your new password.
        </p>
        <Link
          to="/admin/sign-in"
          className={buttonClasses("primary", "md", "mt-6 w-full")}
        >
          Sign in
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await staffAuthApi.resetPassword({ token, password: values.password });
      setDone(true);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["password"]));
    }
  });

  return (
    <AuthLayout title="Choose a new password" footer={backToSignIn}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField
          label="New password"
          error={errors.password?.message}
          hint="At least 8 characters, with upper and lower case letters and a number."
        >
          {(field) => (
            <Input
              {...field}
              {...register("password")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
