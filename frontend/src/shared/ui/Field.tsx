import { useId, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { controlClasses } from "./classes";

export interface InputProps extends ComponentProps<"input"> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn("h-10", className))}
      {...props}
    />
  );
}

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn("py-2", className))}
      {...props}
    />
  );
}

/** Ids/ARIA wiring handed to the control rendered inside a FormField. */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  invalid: boolean;
}

export interface FormFieldProps {
  label: ReactNode;
  /** Error message (from React Hook Form or the API). */
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  /** Render-prop so the control gets matching id / aria-describedby. */
  children: (control: FieldControlProps) => ReactElement;
  className?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
}

/**
 * Label + control + hint + error, with correct `for` / `aria-describedby`
 * wiring so screen readers announce the error with the field.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
  hideLabel,
}: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn("text-sm font-medium text-ink", hideLabel && "sr-only")}
      >
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error) || undefined,
        invalid: Boolean(error),
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Banner for form-level errors (e.g. "Invalid credentials"). */
export function FormAlert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    danger: "bg-danger-soft text-danger border-danger/20",
    success: "bg-success-soft text-success border-success/20",
    info: "bg-info-soft text-info border-info/20",
  };
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-field border px-3 py-2.5 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}
