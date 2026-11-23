import * as SelectPrimitive from "@radix-ui/react-select";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { controlClasses } from "./classes";

/* ── Select ────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

/** Accessible select (keyboard, typeahead, screen readers) via Radix. */
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  invalid,
  disabled,
  className,
  ...aria
}: SelectProps) {
  return (
    // Always controlled: "" (no choice yet) shows the placeholder.
    <SelectPrimitive.Root
      value={value ?? ""}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={controlClasses(
          invalid,
          cn("flex h-10 items-center justify-between gap-2 text-left", className),
        )}
        {...aria}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} className="text-ink-subtle" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-line bg-surface shadow-overlay"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-center rounded-field py-2 pl-8 pr-3 text-sm text-ink outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-muted data-[disabled]:opacity-50"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
                  <Check size={14} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ── Checkbox ──────────────────────────────────────────────────────── */

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 has-[button:disabled]:cursor-not-allowed">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[0.3rem] border border-line-strong bg-surface transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-on-accent disabled:opacity-50"
      >
        <CheckboxPrimitive.Indicator>
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-ink-subtle">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* ── Switch ────────────────────────────────────────────────────────── */

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** On/off setting with a visible label and optional description. */
export function Switch({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 has-[button:disabled]:cursor-not-allowed">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description && <span className="text-xs text-ink-subtle">{description}</span>}
      </span>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-line-strong transition-colors data-[state=checked]:bg-accent disabled:opacity-50"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-card transition-transform data-[state=checked]:translate-x-[1.375rem]" />
      </SwitchPrimitive.Root>
    </label>
  );
}
