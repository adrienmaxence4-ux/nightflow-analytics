"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/use-admin";
import { StatusPill } from "@/features/integrations/status-pill";
import {
  ConnectionNotes,
  ConnectorLogo,
  ConnectorSkeleton,
  DisconnectButton,
  FoldedPath,
  SecretInput,
  SyncButton,
} from "@/features/integrations/connector-ui";
import {
  announceIntegrationChange,
  useConnection,
} from "@/features/integrations/use-connection";

/**
 * Why the OAuth callback stopped, in the merchant's words. Keys match the
 * `reason` the /shopify/callback route appends when it bails out.
 */
const OAUTH_FAILURES: Record<string, string> = {
  params: "réponse incomplète de Shopify. Réessayez.",
  state: "la session d'autorisation a expiré. Relancez la connexion.",
  hmac: "Shopify a renvoyé une signature invalide. Relancez la connexion.",
  token: "Shopify a refusé l'échange. L'app n'est probablement pas autorisée pour cette boutique.",
  supabase: "base de données indisponible.",
  store: "aucune boutique rattachée à votre compte.",
  persist: "enregistrement impossible. Réessayez.",
};

/**
 * In-app Shopify connection: each logged-in user enters THEIR own store domain
 * and authorizes it via OAuth — the data synced is theirs, isolated by RLS.
 * Shows the full connection lifecycle (connected/syncing/error/expired).
 *
 * Until Shopify approves the public app, OAuth only works for the owner's
 * development store. So customers lead with an Admin API token from a custom
 * app they create in their own admin (POST /shopify/token), OAuth folded under
 * it; the owner keeps OAuth first.
 */
export function ShopifyConnect() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const connection = useConnection("shopify");
  const { status, busy } = connection;
  const [domain, setDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [tokenShop, setTokenShop] = useState("");
  const [token, setToken] = useState("");
  const [tokenErrors, setTokenErrors] = useState<{ shop?: string; token?: string }>({});
  const [tokenBusy, setTokenBusy] = useState(false);

  // Surface the result of the OAuth redirect (?shopify=error&reason=…) under
  // the domain field, then drop the query so a reload does not repeat it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("shopify") !== "error") return;
    const why = OAUTH_FAILURES[params.get("reason") ?? ""];
    setDomainError(why ? `Connexion Shopify interrompue : ${why}` : "Connexion Shopify échouée.");
    router.replace(pathname);
  }, [router, pathname]);

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
      setDomainError("Entrez un domaine valide, ex. ma-boutique.myshopify.com");
      return;
    }
    setDomainError(null);
    window.location.href = `/api/integrations/shopify?shop=${encodeURIComponent(shop)}`;
  };

  const connectWithToken = async () => {
    const shop = normalizeShop(tokenShop || domain);
    const next: typeof tokenErrors = {};
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
      next.shop = "Entrez un domaine valide, ex. ma-boutique.myshopify.com";
    }
    if (!token.trim()) next.token = "Collez le jeton Admin API (shpat_…).";
    setTokenErrors(next);
    if (next.shop || next.token) return;
    setTokenBusy(true);
    try {
      const res = await fetch("/api/integrations/shopify/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shop, token: token.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        shopName?: string;
        error?: string;
        synced?: { orders: number; ordersError?: string } | null;
      };
      if (!res.ok) {
        // The route says exactly what is wrong (token refused, read_orders
        // missing, store not found): under the field, where the fix happens.
        setTokenErrors({ token: data.error ?? "Connexion Shopify impossible" });
        return;
      }
      // Connected, but Shopify refused the orders read: say so now rather than
      // letting "0 commande" pass for a fact until the next sync.
      if (data.synced?.ordersError) toast(data.synced.ordersError, "info");
      toast(`Boutique ${data.shopName ?? shop} connectée`);
      setToken("");
      setTokenShop("");
      announceIntegrationChange("shopify");
    } catch {
      setTokenErrors({ token: "Connexion impossible. Vérifiez votre réseau et réessayez." });
    } finally {
      setTokenBusy(false);
    }
  };

  if (!status) return <ConnectorSkeleton variant="form" />;

  const needsReconnect = status.state === "error" || status.state === "expired";
  // The public app is still under Shopify review: OAuth works for the owner's
  // store only, so customers get the token form first.
  const tokenLeads = !isAdmin;
  // A store connected before the write scopes existed keeps reading fine but
  // can't be modified by the Copilot. Re-running OAuth is the only way to grant
  // the new rights, so the button stays available while connected — for the
  // owner; a customer's OAuth would fail for the same review reason.
  const canReauthorize = isAdmin && status.connected && !!status.shop;
  const showForms = status.state === "not_connected" || needsReconnect;

  const oauthForm = (
    <div className="flex w-full flex-col gap-3 sm:max-w-[520px]">
      <Field
        id="shopify-domain"
        label="Adresse de votre boutique Shopify"
        hint="Ex. ma-boutique.myshopify.com — ou collez l'adresse de votre admin Shopify."
        error={domainError}
      >
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="ma-boutique.myshopify.com"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div>
        <Button size="sm" variant={tokenLeads ? "ghost" : "primary"} onClick={() => connect()}>
          Connecter Shopify
        </Button>
      </div>
    </div>
  );

  const tokenForm = (
    <div className="flex w-full flex-col gap-3 sm:max-w-[520px]">
      <Field id="shopify-token-shop" label="Adresse de la boutique" error={tokenErrors.shop}>
        <Input
          value={tokenShop}
          onChange={(e) => setTokenShop(e.target.value)}
          placeholder="ma-boutique.myshopify.com"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={tokenBusy}
        />
      </Field>
      <Field
        id="shopify-token"
        label="Jeton Admin API"
        hint={
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Admin Shopify → Paramètres → Applications et canaux de vente → Développer des
              applications → Créer une application
            </li>
            <li>Configurer les accès Admin API : cochez read_orders et read_products</li>
            <li>Installer l&apos;application, puis copiez le jeton (commence par shpat_)</li>
          </ol>
        }
        error={tokenErrors.token}
      >
        <SecretInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connectWithToken()}
          placeholder="shpat_…"
          disabled={tokenBusy}
        />
      </Field>
      <div>
        <Button size="sm" onClick={connectWithToken} loading={tokenBusy}>
          Connecter avec le jeton Admin API
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo>S</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-head">Shopify</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-label font-normal text-ink2">
            {status.connected && status.shop
              ? `Connecté à ${status.shop}`
              : "Connectez votre boutique pour importer produits, commandes & ventes."}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — reconnectez votre boutique."
          />
          {canReauthorize && (
            <p className="mt-1 text-label font-normal text-ink3">
              Le Copilot doit pouvoir modifier prix, stock et codes promo pour
              appliquer ses recommandations : reconnectez la boutique une fois
              pour lui accorder ces droits.
            </p>
          )}
        </div>

        {status.state !== "not_connected" && (
          <div className="flex flex-wrap items-center gap-2">
            {((needsReconnect && !tokenLeads) || canReauthorize) && (
              <Button size="sm" onClick={() => connect(status.shop ?? undefined)}>
                {needsReconnect ? "Reconnecter" : "Autoriser les modifications"}
              </Button>
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
              name="Shopify"
              onClick={() => connection.disconnect("Boutique Shopify déconnectée")}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {showForms &&
        (tokenLeads ? (
          <>
            <div className="mt-4">{tokenForm}</div>
            <FoldedPath
              id="shopify-oauth-path"
              label="Connexion en un clic — en validation Shopify"
              defaultOpen={!!domainError}
            >
              {oauthForm}
            </FoldedPath>
          </>
        ) : (
          <>
            {status.state === "not_connected" && <div className="mt-4">{oauthForm}</div>}
            <FoldedPath id="shopify-token-path" label="Connecter avec un jeton Admin API">
              {tokenForm}
            </FoldedPath>
          </>
        ))}
    </Card>
  );
}
