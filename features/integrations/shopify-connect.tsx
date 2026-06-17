"use client";

import { useState } from "react";
import { RefreshCw, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

/**
 * In-app Shopify connection: each logged-in user enters THEIR own store domain
 * and authorizes it via OAuth — the data synced is theirs, isolated by RLS.
 */
export function ShopifyConnect() {
  const toast = useToast();
  const [domain, setDomain] = useState("");
  const [syncing, setSyncing] = useState(false);

  const connect = () => {
    let shop = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (shop && !shop.includes(".")) shop = `${shop}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      toast("Entrez un domaine valide, ex. ma-boutique.myshopify.com", "info");
      return;
    }
    // Top-level navigation to start the OAuth grant.
    window.location.href = `/api/integrations/shopify?shop=${encodeURIComponent(shop)}`;
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/shopify/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(
          `Synchronisé : ${data.products ?? 0} produits, ${data.orders ?? 0} commandes ✓`
        );
      } else {
        toast(data.error ?? "Connectez d'abord votre boutique", "info");
      }
    } catch {
      toast("Synchronisation impossible", "info");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl">
          🛍
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">Shopify</h3>
            <Badge variant="lime">Disponible</Badge>
          </div>
          <p className="text-[12px] text-ink-mut">
            Connectez <b>votre</b> boutique pour importer produits, commandes &
            ventes.
          </p>
        </div>

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
            onClick={connect}
            className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
          >
            Connecter
          </button>
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {syncing ? "…" : "Synchroniser"}
          </button>
        </div>
      </div>
    </Card>
  );
}
