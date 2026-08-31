"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/utils/format";
import type { IntegrationStatus } from "@/features/integrations/status-pill";

/**
 * The pieces every integration card is built from — logo tile, status notes and
 * the three buttons — so the five cards stay visually identical without copying
 * the same Tailwind strings five times.
 */

const PRIMARY =
  "rounded-xl bg-accent px-4 py-2.5 text-[15px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60";
const GHOST =
  "rounded-xl border border-line bg-panel2 px-4 py-2.5 text-[13px] font-semibold text-ink2 transition hover:border-line hover:text-ink disabled:opacity-60";

/** Gradient tile holding the provider's emoji or initial. */
export function ConnectorLogo({
  accent,
  className,
  children,
}: {
  /** Tailwind gradient stops, e.g. "from-indigo-400 to-violet-500". */
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br text-xl",
        accent,
        className
      )}
    >
      {children}
    </span>
  );
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
        <p className="mt-0.5 text-[11px] text-ink3">
          Dernière synchro : {timeAgo(status.lastSync)}
        </p>
      )}
      {status.state === "error" && status.error && (
        <p className="mt-0.5 text-[11px] text-bad">{status.error}</p>
      )}
      {status.state === "expired" && expiredHint && (
        <p className="mt-0.5 text-[11px] text-warn">{expiredHint}</p>
      )}
    </>
  );
}

/** Gradient call-to-action: "Connecter", "Reconnecter", "Se connecter avec X". */
export function PrimaryButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn(PRIMARY, className)}>
      {children}
    </button>
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
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex items-center gap-1.5",
        variant === "primary" ? PRIMARY : GHOST
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      {busy ? "Synchro…" : "Synchroniser"}
    </button>
  );
}

export function DisconnectButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-[13px] font-semibold text-ink2 transition hover:border-bad hover:text-ink disabled:opacity-60"
    >
      Déconnecter
    </button>
  );
}
