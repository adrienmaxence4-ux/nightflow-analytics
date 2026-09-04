"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_STATUS,
  type IntegrationStatus,
} from "@/features/integrations/status-pill";

/**
 * The connection lifecycle every integration card shares: read the current
 * status, connect, synchronise, disconnect — all against the generic
 * /api/integrations/[provider] routes, with the toasts and the busy flag.
 *
 * Cards keep their own markup and their own credential fields; only the
 * plumbing lives here.
 */

/** What the connect/sync routes report back. */
export interface SyncSummary {
  orders?: number;
  products?: number;
  revenueCents?: number;
  error?: string;
  /** Set when the key was valid but the initial import itself failed. */
  syncWarning?: string;
}

const euros = (cents = 0) =>
  Math.round(cents / 100).toLocaleString("fr-FR");

/** Default sync toast: "Synchronisé : 12 commandes, 1 480 € ✓". */
export const ordersAndRevenue = (d: SyncSummary) =>
  `Synchronisé : ${d.orders ?? 0} commandes, ${euros(d.revenueCents)} € ✓`;

export function useConnection(provider: string) {
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationStatus>(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        const all = await res.json();
        if (all[provider]) setStatus({ ...DEFAULT_STATUS, ...all[provider] });
      }
    } catch {
      /* ignore — the card just stays on its last known status */
    }
  }, [provider]);

  useEffect(() => {
    reload();
  }, [reload]);

  const post = async (action: string, body?: unknown): Promise<Response> =>
    fetch(`/api/integrations/${provider}/${action}`, {
      method: "POST",
      ...(body
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });

  /**
   * Sends the customer's credential. Returns the route's payload on success and
   * null on failure (the error is already shown), so the caller only has to
   * describe its own success.
   */
  const connect = async (
    credential: string,
    failure: string
  ): Promise<SyncSummary | null> => {
    setBusy(true);
    try {
      const res = await post("connect", { apiKey: credential });
      const data = (await res.json().catch(() => ({}))) as SyncSummary;
      if (res.ok) return data;
      toast(data.error ?? failure, "info");
      return null;
    } catch {
      toast(failure, "info");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sync = async (describe: (d: SyncSummary) => string = ordersAndRevenue) => {
    setBusy(true);
    setStatus((s) => ({ ...s, state: "syncing" }));
    try {
      const res = await post("sync");
      const data = (await res.json().catch(() => ({}))) as SyncSummary;
      toast(
        res.ok ? describe(data) : (data.error ?? "Synchronisation impossible"),
        res.ok ? "success" : "info"
      );
    } catch {
      toast("Synchronisation impossible", "info");
    } finally {
      setBusy(false);
      reload();
    }
  };

  const disconnect = async (done: string) => {
    setBusy(true);
    try {
      await post("disconnect");
      toast(done);
      setStatus(DEFAULT_STATUS);
    } catch {
      toast("Impossible de déconnecter", "info");
    } finally {
      setBusy(false);
    }
  };

  return { status, setStatus, busy, reload, connect, sync, disconnect };
}
