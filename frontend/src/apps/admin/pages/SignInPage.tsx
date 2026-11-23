import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { isApiError } from "@/shared/api/errors";
import { useStaffSession } from "@/shared/auth/staff-session";
import { useStaffAuth } from "@/shared/auth/use-staff-auth";
import { signInSchema, type SignInValues } from "@/shared/schemas/auth";
import { Button, FormAlert, FormField, Input, PageSpinner } from "@/shared/ui";
import { safeAdminRedirect } from "../auth/redirect";
import { AuthLayout } from "../layouts/AuthLayout";

export function SignInPage() {
  const [params] = useSearchParams();
  const redirectTo = safeAdminRedirect(params.get("redirect"));
  const navigate = useNavigate();
  const { signIn } = useStaffAuth();
  const signedIn = useStaffSession((s) => Boolean(s.accessToken));
  const bootstrapping = useStaffSession((s) => s.bootstrapping);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  if (bootstrapping) return <PageSpinner label="Checking your session" />;
  if (signedIn) return <Navigate to={redirectTo} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setFormError("That email and password don't match an account.");
      } else if (isApiError(error) && error.status === 429) {
        setFormError("Too many attempts. Please wait a minute and try again.");
      } else {
        setFormError(
          isApiError(error) ? error.message : "Sign-in failed. Please try again.",
        );
      }
    }
  });

  return (
    <AuthLayout title="Sign in" description="Manage your organization, menu and orders.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <Input {...field} {...register("email")} type="email" autoComplete="email" />
          )}
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("password")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </FormField>
        <div className="flex justify-end">
          <Link
            to="/admin/forgot-password"
            className="text-sm font-medium text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
