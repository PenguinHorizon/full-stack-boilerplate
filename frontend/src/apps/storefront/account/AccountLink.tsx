import { UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useCustomerSession } from "./customer-session";

/** Header: the customer's account, or sign-in for guests. */
export function AccountLink() {
  const signedIn = useCustomerSession((state) => state.status === "signed-in");
  const name = useCustomerSession((state) => state.customer?.name);
  return (
    <Link
      to={signedIn ? "/account" : "/account/sign-in"}
      className="grid size-10 place-items-center rounded-full border border-line text-ink hover:bg-surface-muted"
      aria-label={signedIn ? `Your account (${name ?? ""})` : "Sign in"}
      title={signedIn ? "Your account" : "Sign in"}
    >
      <UserRound size={18} aria-hidden="true" />
    </Link>
  );
}
