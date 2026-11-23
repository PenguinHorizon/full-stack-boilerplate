import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/format";
import { Button } from "./Button";

/*
 * Modals, drawers, menus and tooltips. Radix handles focus trapping, focus
 * return, Esc, scroll lock and ARIA; we only style. Content is portalled to
 * <body>, which works because app scopes (`data-app`) live on <html>.
 */

const OVERLAY = "fixed inset-0 z-40 bg-[rgb(15_23_42/0.45)]";

interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogShellProps & { size?: "sm" | "md" | "lg" }) {
  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-card border border-line bg-surface shadow-overlay",
            width,
          )}
          // Descriptions are optional; avoid Radix's missing-description warning.
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-ink">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-mr-1 rounded-control p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink"
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
}: DialogShellProps & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(24rem,100vw-3rem)] flex-col bg-surface shadow-overlay",
            side === "right" ? "right-0 border-l" : "left-0 border-r",
            "border-line",
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <DialogPrimitive.Title className="text-base font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-control p-1.5 text-ink-subtle hover:bg-surface-muted hover:text-ink"
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>
          {description && (
            <DialogPrimitive.Description className="px-5 pt-3 text-sm text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !loading && onOpenChange(next)}
      title={title}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted">{description}</p>
    </Modal>
  );
}

/* ── Dropdown menu ─────────────────────────────────────────────────── */

export function Menu(props: ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root {...props} />;
}

export function MenuTrigger(props: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger {...props} />;
}

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-48 rounded-card border border-line bg-surface p-1 shadow-overlay",
          className,
        )}
      >
        {children}
      </MenuPrimitive.Content>
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  tone = "default",
  icon: Icon,
}: {
  children: ReactNode;
  onSelect?: () => void;
  tone?: "default" | "danger";
  icon?: LucideIcon;
}) {
  return (
    <MenuPrimitive.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-field px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-muted",
        tone === "danger" ? "text-danger" : "text-ink",
      )}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </MenuPrimitive.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <MenuPrimitive.Label className="px-2.5 py-2">{children}</MenuPrimitive.Label>;
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-line" />;
}

/* ── Tooltip ───────────────────────────────────────────────────────── */

export function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider {...props} />;
}

export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 rounded-field bg-ink px-2 py-1 text-xs font-medium text-white shadow-raised"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
