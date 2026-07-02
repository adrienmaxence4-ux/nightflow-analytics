"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, KeyRound, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/utils/format";
import {
  DEFAULT_STATUS,
  StatusPill,
  type IntegrationStatus,
} from "@/features/integrations/status-pill";

/**
 * WooCommerce connector — the customer pastes their store URL + a READ-ONLY
 * REST key pair (WooCommerce → Réglages → Avancé → API REST). Sent as one
 * composite credential to the generic keyed-provider connect route (validated
 * server-side, encrypted at rest). The user types their own secret — we never
 * generate or display it.
 */
export function WooConnect() {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [ck, setCk] = useState("");
  const [cs, setCs] = useState("");
  const [status, setStatus] = useState<IntegrationStatus>(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        if (j.woocommerce) setStatus({ ...DEFAULT_STATUS, ...j.woocommerce });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    let base = url.trim().replace(/\/+$/, "");
    if (base && !/^https?:\/\//.test(base)) base = `https://${base}`;
    if (!/^https:\/\/.+\..+/.test(base)) {
      toast("Entre l'adresse HTTPS de ta boutique, ex. https://maboutique.fr", "info");
      return;
    }
    if (!ck.trim().startsWith("ck_") || !cs.trim().startsWith("cs_")) {
      toast("La clé commence par ck_ et le secret par cs_", "info");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/woocommerce/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: `${base}::${ck.trim()}::${cs.trim()}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast("WooCommerce connecté ✓ — première synchronisation lancée");
        setUrl("");
        setCk("");
        setCs("");
        loadStatus();
      } else {
        toast(data.error ?? "Connexion WooCommerce impossible", "info");
      }
    } catch {
      toast("Connexion WooCommerce impossible", "info");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setStatus((s) => ({ ...s, state: "syncing" }));
    try {
      const res = await fetch("/api/integrations/woocommerce/sync", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(
          `Synchronisé : ${data.orders ?? 0} commandes, ${Math.round(
            (data.revenueCents ?? 0) / 100
          ).toLocaleString("fr-FR")} € ✓`
        );
      } else {
        toast(data.error ?? "Synchronisation impossible", "info");
      }
    } catch {
      toast("Synchronisation impossible", "info");
    } finally {
      setBusy(false);
      loadStatus();
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/integrations/woocommerce/disconnect", { method: "POST" });
      toast("WooCommerce déconnecté");
      setStatus(DEFAULT_STATUS);
    } catch {
      toast("Impossible de déconnecter", "info");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-700 text-xl">
          🛒
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">WooCommerce</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink-mut">
            {status.connected
              ? "Produits & commandes importés depuis votre boutique WordPress."
              : "Boutique WordPress ? Connectez WooCommerce : produits, commandes & revenus."}
          </p>
          {status.connected && status.lastSync && (
            <p className="mt-0.5 text-[11px] text-ink-mut">
              Dernière synchro : il y a {timeAgo(status.lastSync)}
            </p>
          )}
          {status.state === "error" && status.error && (
            <p className="mt-0.5 text-[11px] text-neon-pinksoft">{status.error}</p>
          )}
        </div>

        {status.state === "not_connected" ? (
          <div className="flex w-full flex-col gap-2 sm:max-w-[420px]">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://maboutique.fr"
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <input
              value={ck}
              onChange={(e) => setCk(e.target.value)}
              placeholder="Consumer key (ck_…)"
              className="glass-input w-full rounded-xl px-3 py-2.5 text-[13px]"
            />
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={cs}
                onChange={(e) => setCs(e.target.value)}
                type="password"
                placeholder="Consumer secret (cs_…)"
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={connect}
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Vérification…" : "Connecter"}
              </button>
              <span className="text-[11px] text-ink-mut">
                WooCommerce → Réglages → Avancé → API REST (Lecture)
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={sync}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Synchro…" : "Synchroniser"}
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="rounded-xl border border-glass-border bg-glass px-3.5 py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-neon-pink hover:text-white disabled:opacity-60"
            >
              Déconnecter
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
