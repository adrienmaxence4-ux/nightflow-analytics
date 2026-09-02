"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/features/integrations/status-pill";
import {
  ConnectionNotes,
  ConnectorLogo,
  DisconnectButton,
  PrimaryButton,
  SyncButton,
} from "@/features/integrations/connector-ui";
import { useConnection } from "@/features/integrations/use-connection";

/**
 * In-app Shopify connection: each logged-in user enters THEIR own store domain
 * and authorizes it via OAuth — the data synced is theirs, isolated by RLS.
 * Shows the full connection lifecycle (connected/syncing/error/expired).
 */
export function ShopifyConnect() {
  const toast = useToast();
  const connection = useConnection("shopify");
  const { status, busy } = connection;
  const [domain, setDomain] = useState("");

  /**
   * Accepts every shape a merchant is likely to paste:
   *   "ma-boutique"
   *   "ma-boutique.myshopify.com" (with or without a trailing path)
   *   "https://ma-boutique.myshopify.com/admin"
   *   "https://admin.shopify.com/store/ma-boutique/settings/domains/123"  ← the
   *     URL the current Shopify admin shows in the address bar
   */
  const normalizeShop = (raw: string): string => {
    const cleaned = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
    const adminMatch = cleaned.match(
      /^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/
    );
    if (adminMatch) return `${adminMatch[1]}.myshopify.com`;
    const host = cleaned.replace(/\/.*$/, "");
    if (host && !host.includes(".")) return `${host}.myshopify.com`;
    return host;
  };

  // Shopify's OAuth is shop-scoped, so it starts from a full page redirect.
  const connect = (preset?: string) => {
    const shop = normalizeShop(preset ?? domain);
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      toast("Entrez un domaine valide, ex. ma-boutique.myshopify.com", "info");
      return;
    }
    window.location.href = `/api/integrations/shopify?shop=${encodeURIComponent(shop)}`;
  };

  const needsReconnect = status.state === "error" || status.state === "expired";
  // A store connected before the write scopes existed keeps reading fine but
  // can't be modified by the Copilot. Re-running OAuth is the only way to grant
  // the new rights, so the button stays available while connected.
  const canReauthorize = status.connected && !!status.shop;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo accent="from-emerald-400 to-emerald-600">🛍</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">Shopify</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink3">
            {status.connected && status.shop
              ? `Connecté à ${status.shop}`
              : "Connectez votre boutique pour importer produits, commandes & ventes."}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — reconnecte ta boutique."
          />
          {canReauthorize && (
            <p className="mt-1 text-[11px] text-ink3">
              Le Copilot doit pouvoir modifier prix, stock et codes promo pour
              appliquer ses recommandations : reconnecte la boutique une fois
              pour lui accorder ces droits.
            </p>
          )}
        </div>

        {status.state === "not_connected" ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                placeholder="ma-boutique.myshopify.com"
                className="field w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <PrimaryButton onClick={() => connect()}>Connecter</PrimaryButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(needsReconnect || canReauthorize) && (
              <PrimaryButton onClick={() => connect(status.shop ?? undefined)}>
                {needsReconnect ? "Reconnecter" : "Autoriser les modifications"}
              </PrimaryButton>
            )}
            <SyncButton
              onClick={() =>
                connection.sync(
                  (d) =>
                    `Synchronisé : ${d.products ?? 0} produits, ${d.orders ?? 0} commandes ✓`
                )
              }
              busy={busy}
            />
            <DisconnectButton
              onClick={() => connection.disconnect("Boutique Shopify déconnectée")}
              disabled={busy}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
