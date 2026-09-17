"use client";

import * as React from "react";
import { ChevronRight, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { IntegrationStatus } from "@/features/integrations/status-pill";

/**
 * The pieces every integration card is built from — logo tile, loading
 * skeleton, status notes, secret field and the two shared buttons — so the
 * cards stay visually identical without copying the same markup five times.
 */

/** Monochrome tile holding the provider's initials (decorative). */
export function ConnectorLogo({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-12 w-12 flex-none place-items-center rounded-[12px] border border-line bg-panel2 text-head font-extrabold text-ink2",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Stand-in for a card whose status has not answered yet — same height, no
 * text. "form" matches a not-connected card with its credential fields open.
 */
export function ConnectorSkeleton({ variant }: { variant?: "form" }) {
  return <Skeleton className={cn("w-full", variant === "form" ? "h-[340px]" : "h-[100px]")} />;
}

/** Last sync, error and (when the provider can expire) the reconnect nudge. */
export function ConnectionNotes({
  status,
  expiredHint,
}: {
  status: IntegrationStatus;
  /** Shown when the token expired; omit for providers whose keys don't expire. */
  expiredHint?: string;
}) {
  return (
    <>
      {status.connected && status.lastSync && (
        // timeAgo already says "il y a …" (or "hier", "à l'instant"), so no
        // prefix here — the four cards used to read "il y a il y a 3 min".
        <p className="mt-1 text-label font-normal text-ink3">
          Dernière synchro : {timeAgo(status.lastSync)}
        </p>
      )}
      {status.state === "error" && status.error && (
        <p role="alert" className="mt-1 text-label font-medium text-bad">
          {status.error}
        </p>
      )}
      {status.state === "expired" && expiredHint && (
        <p className="mt-1 text-label text-warn">{expiredHint}</p>
      )}
    </>
  );
}

/**
 * Password-style `<Input>` with a show/hide toggle. Forwards `id`,
 * `aria-invalid` and `aria-describedby` from `<Field>` to the input itself.
 */
export const SecretInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [reveal, setReveal] = React.useState(false);
    return (
      <span className="relative block">
        <Input
          ref={ref}
          type={reveal ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          className={cn("pr-14 font-mono", className)}
          {...props}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Masquer la clé" : "Afficher la clé"}
          aria-pressed={reveal}
          className="absolute right-1 top-1/2 -translate-y-1/2 border-transparent bg-transparent"
        >
          {reveal ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </Button>
      </span>
    );
  }
);
SecretInput.displayName = "SecretInput";

/**
 * A second way to connect, folded under the main one: a ghost button that
 * reveals the form. Used while a platform review blocks the one-click path.
 */
export function FoldedPath({
  id,
  label,
  defaultOpen = false,
  children,
}: {
  id: string;
  label: string;
  /** Unfold without a click — e.g. when the folded path just failed. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={cn("h-4 w-4 transition duration-base", open && "rotate-90")}
          aria-hidden
        />
        {label}
      </Button>
      {open && (
        <div id={id} className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function SyncButton({
  onClick,
  busy,
  variant = "ghost",
}: {
  onClick: () => void;
  busy: boolean;
  /** "primary" for the cards where syncing is the main action. */
  variant?: "ghost" | "primary";
}) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} loading={busy}>
      <RefreshCw className="h-4 w-4" aria-hidden />
      Synchroniser
    </Button>
  );
}

/** Asks before cutting the connection — one misclick used to drop a store. */
export function DisconnectButton({
  name,
  onClick,
  disabled,
}: {
  name: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={disabled}
      onClick={() => {
        if (window.confirm(`Déconnecter ${name} ? Vous pourrez le reconnecter à tout moment.`)) {
          onClick();
        }
      }}
    >
      Déconnecter
    </Button>
  );
}
