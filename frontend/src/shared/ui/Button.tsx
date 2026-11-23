import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  buttonClasses,
  iconButtonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./classes";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const iconSize = size === "lg" ? 18 : 16;
  return (
    <button
      // A bare <button> inside a <form> would submit it.
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner size={iconSize} />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden="true" />
      )}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden="true" />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ComponentProps<"button">, "children"> {
  icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  badge?: ReactNode;
}

export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  size = "md",
  className,
  badge,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={iconButtonClasses(variant, size, className)}
      {...props}
    >
      <Icon size={size === "sm" ? 16 : 18} aria-hidden="true" className="shrink-0" />
      {badge}
    </button>
  );
}
