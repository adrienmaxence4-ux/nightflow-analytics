"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/utils/format";
import {
  DEFAULT_STATUS,
  StatusPill,
  type IntegrationStatus,
} from "@/features/integrations/status-pill";

/**
 * In-app Shopify connection: each logged-in user enters THEIR own store domain
 * and authorizes it via OAuth — the data synced is theirs, isolated by RLS.
 * Shows the full connection lifecycle (connected/syncing/error/expired).
 */
export function ShopifyConnect() {
  const toast = useToast();
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<IntegrationStatus>(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        if (j.shopify) setStatus({ ...DEFAULT_STATUS, ...j.shopify });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const normalizeShop = (raw: string): string => {
    let shop = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (shop && !shop.includes(".")) shop = `${shop}.myshopify.com`;
    return shop;
  };

  const connect = (preset?: string) => {
    const shop = normalizeShop(preset ?? domain);
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      toast("Entrez un domaine valide, ex. ma-boutique.myshopify.com", "info");
      return;
    }
    window.location.href = `/api/integrations/shopify?shop=${encodeURIComponent(shop)}`;
  };

  const sync = async () => {
    setBusy(true);
    setStatus((s) => ({ ...s, state: "syncing" }));
    try {
      const res = await fetch("/api/integrations/shopify/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(
          `Synchronisé : ${data.products ?? 0} produits, ${data.orders ?? 0} commandes ✓`
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
      await fetch("/api/integrations/shopify/disconnect", { method: "POST" });
      toast("Boutique Shopify déconnectée");
      setStatus(DEFAULT_STATUS);
    } catch {
      toast("Impossible de déconnecter", "info");
    } finally {
      setBusy(false);
    }
  };

  const needsReconnect = status.state === "error" || status.state === "expired";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl">
          🛍
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">Shopify</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink-mut">
            {status.connected && status.shop
              ? `Connecté à ${status.shop}`
              : "Connectez votre boutique pour importer produits, commandes & ventes."}
          </p>
          {status.connected && status.lastSync && (
            <p className="mt-0.5 text-[11px] text-ink-mut">
              Dernière synchro : il y a {timeAgo(status.lastSync)}
            </p>
          )}
          {status.state === "error" && status.error && (
            <p className="mt-0.5 text-[11px] text-neon-pinksoft">{status.error}</p>
          )}
          {status.state === "expired" && (
            <p className="mt-0.5 text-[11px] text-neon-amber">
              Jeton expiré — reconnecte ta boutique.
            </p>
          )}
        </div>

        {status.state === "not_connected" ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                placeholder="ma-boutique.myshopify.com"
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <button
              onClick={() => connect()}
              className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
            >
              Connecter
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {needsReconnect && (
              <button
                onClick={() => connect(status.shop ?? undefined)}
                className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
              >
                Reconnecter
              </button>
            )}
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
