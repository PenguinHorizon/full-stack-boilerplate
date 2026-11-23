/**
 * Post-sign-in destination from `?redirect=`. Only paths inside the admin app
 * are honoured, which blocks open redirects such as `?redirect=//evil.example`
 * or `?redirect=https://evil.example`.
 */
export function safeAdminRedirect(value: string | null | undefined): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("\\")) return "/admin";
  // "/administrator" is not inside the app; "/admin" and "/admin/..." are.
  if (value !== "/admin" && !/^\/admin[/?#]/.test(value)) return "/admin";
  return value;
}
