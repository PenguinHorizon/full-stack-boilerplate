import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi } from "@/shared/api/customer";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { applyServerErrors } from "@/shared/forms/server-errors";
import { formatPhone } from "@/shared/lib/format";
import {
  customerPasswordSchema,
  customerProfileSchema,
  customerRegisterSchema,
  customerResetSchema,
  customerSignInSchema,
  type CustomerPasswordValues,
  type CustomerProfileValues,
  type CustomerRegisterValues,
  type CustomerResetValues,
  type CustomerSignInValues,
} from "@/shared/schemas/customer";
import { Button } from "@/shared/ui/Button";
import { FormAlert, FormField, Input } from "@/shared/ui/Field";
import { PageSpinner } from "@/shared/ui/Spinner";
import type { CustomerSessionResponse } from "@/shared/types/api.generated";
import { useCustomerSession, withCustomer } from "../account/customer-session";
import { Container, Seo } from "../components/Bits";
import { useSite } from "../site-context";

/** Where to go after signing in: a same-site path from `?next=`, else the account. */
function nextPath(params: URLSearchParams): string {
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="max-w-md py-12 sm:py-16">
      <Seo title={title} />
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-6">{children}</div>
    </Container>
  );
}

function useStartSession() {
  const { slug } = useSite();
  const signIn = useCustomerSession((state) => state.signIn);
  const queryClient = useQueryClient();
  return (session: CustomerSessionResponse) => {
    void queryClient.removeQueries({ queryKey: queryKeys.customer(slug) });
    signIn(slug, session);
  };
}

export function CustomerSignInPage() {
  const { slug } = useSite();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const start = useStartSession();
  const [formError, setFormError] = useState<string | null>(null);
  const status = useCustomerSession((state) => state.status);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerSignInValues>({
    resolver: zodResolver(customerSignInSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const login = useMutation({
    mutationFn: (values: CustomerSignInValues) => customerApi.login(slug, values),
    onSuccess: (session) => {
      start(session);
      navigate(nextPath(params), { replace: true });
    },
    onError: (error) =>
      setFormError(applyServerErrors(error, setError, ["identifier", "password"])),
  });
  if (status === "signed-in") return <Navigate to={nextPath(params)} replace />;
  return (
    <AuthCard title="Sign in">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          login.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField
          label="Phone number or email"
          required
          error={errors.identifier?.message}
        >
          {(field) => (
            <Input {...field} {...register("identifier")} autoComplete="username" />
          )}
        </FormField>
        <FormField label="Password" required error={errors.password?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("password")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/account/forgot-password" className="font-medium text-accent">
          Forgot your password?
        </Link>
        <Link
          to={`/account/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}
          className="font-medium text-accent"
        >
          Create an account
        </Link>
      </div>
    </AuthCard>
  );
}

export function CustomerRegisterPage() {
  const { slug } = useSite();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const start = useStartSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerRegisterValues>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { name: "", phone: "", email: "", password: "" },
  });
  const create = useMutation({
    mutationFn: (values: CustomerRegisterValues) =>
      customerApi.register(slug, { ...values, email: values.email.trim() || null }),
    onSuccess: (session) => {
      start(session);
      toast.success("Welcome! Your account is ready.");
      navigate(nextPath(params), { replace: true });
    },
    onError: (error) =>
      setFormError(
        applyServerErrors(error, setError, ["name", "phone", "email", "password"], {
          PHONE_TAKEN: "phone",
          EMAIL_TAKEN: "email",
        }),
      ),
  });
  return (
    <AuthCard title="Create an account">
      <p className="-mt-2 mb-4 text-sm text-ink-muted">
        Keep your addresses, see your orders and order again in a tap.
      </p>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          create.mutate(values);
        })}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Name" required error={errors.name?.message}>
          {(field) => <Input {...field} {...register("name")} autoComplete="name" />}
        </FormField>
        <FormField label="Phone" required error={errors.phone?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          )}
        </FormField>
        <FormField
          label="Email"
          error={errors.email?.message}
          hint="Optional — needed to reset your password."
        >
          {(field) => (
            <Input {...field} {...register("email")} type="email" autoComplete="email" />
          )}
        </FormField>
        <FormField
          label="Password"
          required
          error={errors.password?.message}
          hint="At least 8 characters with a letter and a number."
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
        <Button type="submit" size="lg" className="w-full" loading={create.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        Already have one?{" "}
        <Link to="/account/sign-in" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export function CustomerForgotPasswordPage() {
  const { slug } = useSite();
  const [email, setEmail] = useState("");
  const send = useMutation({
    mutationFn: () => customerApi.forgotPassword(slug, email.trim()),
  });
  return (
    <AuthCard title="Reset your password">
      {send.isSuccess ? (
        <FormAlert tone="success">{send.data.message}</FormAlert>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            send.mutate();
          }}
        >
          {send.isError && <FormAlert>{errorMessage(send.error)}</FormAlert>}
          <FormField label="Email" required hint="The email on your account.">
            {(field) => (
              <Input
                {...field}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            )}
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={send.isPending}>
            Send reset link
          </Button>
        </form>
      )}
      <Link
        to="/account/sign-in"
        className="mt-6 inline-block text-sm font-medium text-accent"
      >
        Back to sign in
      </Link>
    </AuthCard>
  );
}

export function CustomerResetPasswordPage() {
  const { slug } = useSite();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const start = useStartSession();
  const token = params.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerResetValues>({
    resolver: zodResolver(customerResetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const reset = useMutation({
    mutationFn: (values: CustomerResetValues) =>
      customerApi.resetPassword(slug, { token, password: values.password }),
    onSuccess: (session) => {
      start(session);
      toast.success("Password changed. You’re signed in.");
      navigate("/account", { replace: true });
    },
    onError: (error) => setFormError(applyServerErrors(error, setError, ["password"])),
  });
  return (
    <AuthCard title="Choose a new password">
      {!token ? (
        <FormAlert>This link is incomplete. Ask for a new one.</FormAlert>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            reset.mutate(values);
          })}
        >
          {formError && <FormAlert>{formError}</FormAlert>}
          <FormField label="New password" required error={errors.password?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("password")}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField label="Repeat it" required error={errors.confirm?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("confirm")}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
            Save password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

/* ── Signed-in area ────────────────────────────────────────────────── */

/**
 * The signed-in area: profile and password. Signed-in customers only;
 * others go to sign in and come back. Add tabs here (e.g. bookings) as the
 * product grows.
 */
export function AccountLayout() {
  const { slug } = useSite();
  const status = useCustomerSession((state) => state.status);
  const customer = useCustomerSession((state) => state.customer);
  const signOut = useCustomerSession((state) => state.signOut);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (status === "unknown") return <PageSpinner label="Loading your account" />;
  if (status === "guest") {
    return <Navigate to="/account/sign-in?next=%2Faccount" replace />;
  }
  const leave = async () => {
    await customerApi.logout(slug).catch(() => undefined);
    signOut();
    queryClient.removeQueries({ queryKey: queryKeys.customer(slug) });
    navigate("/", { replace: true });
  };
  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Signed in as</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {customer?.name}
          </h1>
        </div>
        <Button variant="ghost" onClick={leave}>
          Sign out
        </Button>
      </div>
      <div className="pt-6">
        <AccountProfilePage />
      </div>
    </Container>
  );
}

export function AccountProfilePage() {
  const { slug } = useSite();
  const customer = useCustomerSession((state) => state.customer)!;
  const setCustomer = useCustomerSession((state) => state.setCustomer);
  const signIn = useCustomerSession((state) => state.signIn);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const profile = useForm<CustomerProfileValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: { name: customer.name, email: customer.email ?? "" },
  });
  const password = useForm<CustomerPasswordValues>({
    resolver: zodResolver(customerPasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const saveProfile = useMutation({
    mutationFn: (values: CustomerProfileValues) =>
      withCustomer(slug, (token) =>
        customerApi.updateMe(slug, token, {
          name: values.name.trim(),
          email: values.email.trim() || null,
        }),
      ),
    onSuccess: (updated) => {
      setCustomer(updated);
      toast.success("Profile saved");
    },
    onError: (error) =>
      setProfileError(
        applyServerErrors(error, profile.setError, ["name", "email"], {
          EMAIL_TAKEN: "email",
        }),
      ),
  });
  const savePassword = useMutation({
    mutationFn: (values: CustomerPasswordValues) =>
      withCustomer(slug, (token) => customerApi.changePassword(slug, token, values)),
    onSuccess: (session) => {
      signIn(slug, session);
      password.reset();
      toast.success("Password changed. Other devices are signed out.");
    },
    onError: (error) =>
      setPasswordError(
        applyServerErrors(error, password.setError, ["currentPassword", "newPassword"]),
      ),
  });
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form
        noValidate
        className="space-y-4 rounded-card border border-line bg-surface p-5"
        onSubmit={profile.handleSubmit((values) => {
          setProfileError(null);
          saveProfile.mutate(values);
        })}
      >
        <h2 className="font-semibold text-ink">Your details</h2>
        {profileError && <FormAlert>{profileError}</FormAlert>}
        <FormField label="Name" required error={profile.formState.errors.name?.message}>
          {(field) => <Input {...field} {...profile.register("name")} />}
        </FormField>
        <FormField label="Email" error={profile.formState.errors.email?.message}>
          {(field) => <Input {...field} {...profile.register("email")} type="email" />}
        </FormField>
        <FormField
          label="Phone"
          hint="Your phone number is how we know you. Contact us to change it."
        >
          {(field) => (
            <Input {...field} value={formatPhone(customer.phone)} disabled readOnly />
          )}
        </FormField>
        <Button type="submit" loading={saveProfile.isPending}>
          Save
        </Button>
      </form>
      <form
        noValidate
        className="space-y-4 rounded-card border border-line bg-surface p-5"
        onSubmit={password.handleSubmit((values) => {
          setPasswordError(null);
          savePassword.mutate(values);
        })}
      >
        <h2 className="font-semibold text-ink">Password</h2>
        {passwordError && <FormAlert>{passwordError}</FormAlert>}
        <FormField
          label="Current password"
          required
          error={password.formState.errors.currentPassword?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...password.register("currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField
          label="New password"
          required
          error={password.formState.errors.newPassword?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...password.register("newPassword")}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>
        <Button type="submit" variant="secondary" loading={savePassword.isPending}>
          Change password
        </Button>
      </form>
    </div>
  );
}
