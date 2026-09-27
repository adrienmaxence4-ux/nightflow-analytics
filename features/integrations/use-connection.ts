"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
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
  /** e.g. "ticket(s)" for Gorgias — "commande(s)" reads wrong on a support connector. */
  resultNoun?: string;
  /** False hides the "X € importés" clause for a connector with no revenue at all. */
  tracksRevenue?: boolean;
}

/** Cents → "1 480 €", the one money format every card toast uses. */
export const euros = (cents = 0) =>
  `${Math.round(cents / 100).toLocaleString("fr-FR")} €`;

/**
 * Two cards can drive the same provider (Stripe OAuth + restricted key). When
 * one changes the connection, the others reload instead of showing a stale
 * "Non connecté" next to a fresh "Connecté".
 */
export const INTEGRATION_CHANGED_EVENT = "nightflow:integration-changed";
const CHANGED_EVENT = INTEGRATION_CHANGED_EVENT;

export function announceIntegrationChange(provider: string) {
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: provider }));
}

/** Default sync toast: "Synchronisé : 12 commandes, 1 480 € ✓". */
export const ordersAndRevenue = (d: SyncSummary) =>
  `Synchronisé : ${d.orders ?? 0} commandes, ${euros(d.revenueCents)} ✓`;

export function useConnection(provider: string) {
  const toast = useToast();
  // `null` until the first status answer: the card shows a skeleton instead of
  // flashing "Non connecté" at a merchant whose store is in fact connected.
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        const all = await res.json();
        if (all[provider]) {
          setStatus({ ...DEFAULT_STATUS, ...all[provider] });
          return;
        }
      }
    } catch {
      /* fall through — the card keeps its last known status */
    }
    // No answer for this provider: leave a loaded card alone, but never leave
    // a fresh one on the skeleton forever.
    setStatus((s) => s ?? DEFAULT_STATUS);
  }, [provider]);

  useEffect(() => {
    reload();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === provider) reload();
    };
    window.addEventListener(CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CHANGED_EVENT, onChange);
  }, [provider, reload]);

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
      if (res.ok) {
        track("integration_connected", { provider });
        announceIntegrationChange(provider);
        return data;
      }
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
    setStatus((s) => ({ ...(s ?? DEFAULT_STATUS), state: "syncing" }));
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
      announceIntegrationChange(provider);
    }
  };

  const disconnect = async (done: string) => {
    setBusy(true);
    try {
      await post("disconnect");
      toast(done);
      setStatus(DEFAULT_STATUS);
      announceIntegrationChange(provider);
    } catch {
      toast("Impossible de déconnecter", "info");
    } finally {
      setBusy(false);
    }
  };

  return { status, setStatus, busy, reload, connect, sync, disconnect };
}
