"use client";

import { useEffect, type ReactNode } from "react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/features/integrations/status-pill";
import {
  ConnectionNotes,
  ConnectorLogo,
  ConnectorSkeleton,
  DisconnectButton,
  FoldedPath,
  SyncButton,
} from "@/features/integrations/connector-ui";
import { useConnection } from "@/features/integrations/use-connection";
import { useIsAdmin } from "@/hooks/use-admin";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/track";

/**
 * One-click OAuth connector ("Se connecter avec Stripe"). No API key: the user
 * authorises their own account and we store the returned token (RLS-isolated).
 * Drives /api/integrations/[provider]/oauth + the shared sync/disconnect routes.
 */
export interface OAuthConnectProps {
  provider: string;
  name: string;
  logo: string;
  description: string;
  connectedHint: string;
  /** Show the manual "Synchroniser" button (false for live-data providers). */
  showSync?: boolean;
  /**
   * The platform grants this connector standard access only: it works for the
   * app owner and fails for everyone else until the platform approves the app.
   * Rather than hide it — the roadmap is worth showing — the card says so and
   * the button is inert for anyone but the owner.
   */
  reviewPending?: boolean;
  /** Who is doing the reviewing — named in the badge and the explanation. */
  reviewer?: string;
  /**
   * What happens for the customer meanwhile, and after. Meta's connectors
   * have Windsor as a stand-in for the same data; a connector with no
   * stand-in says what the unlock will look like instead of pointing at a
   * card that would not show it.
   */
  reviewHint?: string;
  /**
   * A second way in — e.g. a restricted key — folded under the OAuth button.
   * With `fallbackPrimary`, customers (non-admins) get it open as the main
   * path and the OAuth button folded under `oauthFoldLabel` instead: the
   * platform's Connect app is not live for them yet, so the one-click path
   * would fail. The owner keeps OAuth first.
   */
  fallbackLabel?: string;
  fallback?: ReactNode;
  fallbackPrimary?: boolean;
  oauthFoldLabel?: string;
}

/**
 * Why the callback stopped, in the customer's words. Keys match the `reason`
 * the /oauth/callback route appends when it bails out.
 */
const OAUTH_FAILURES: Record<string, string> = {
  token:
    "la plateforme a refusé l'échange. La clé secrète de l'app est probablement incorrecte ou tronquée.",
  state: "la session d'autorisation a expiré. Relancez la connexion.",
  denied: "autorisation refusée.",
  params: "réponse incomplète de la plateforme. Réessayez.",
  store: "aucune boutique rattachée à votre compte.",
  provider: "connecteur inconnu.",
  supabase: "base de données indisponible.",
};

export function OAuthConnect({
  provider,
  name,
  logo,
  description,
  connectedHint,
  showSync = true,
  reviewPending = false,
  reviewer = "Meta",
  reviewHint = "En attendant, la carte « Meta Ads, TikTok Ads, Google Ads — via Windsor.ai » couvre les mêmes données.",
  fallbackLabel,
  fallback,
  fallbackPrimary = false,
  oauthFoldLabel = "Connexion en un clic — bientôt",
}: OAuthConnectProps) {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const connection = useConnection(provider);
  const { status, busy } = connection;
  // Standard access covers accounts with a role on the app — in practice, the
  // owner. Everyone else would hit an opaque platform error mid-flow.
  const locked = reviewPending && !isAdmin;

  // Surface the result of the OAuth redirect (?stripe=connected|error|…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get(provider);
    if (!outcome) return;
    if (outcome === "connected") {
      track("integration_connected", { provider });
      toast(`${name} connecté ✓`);
    }
    else if (outcome === "notconfigured")
      toast(`${name} OAuth pas encore configuré`, "info");
    else if (outcome === "error") {
      // The callback already knows why it gave up; saying "échouée" and
      // dropping the reason turns a two-minute fix into a debugging session.
      const why = OAUTH_FAILURES[params.get("reason") ?? ""];
      toast(why ? `${name} : ${why}` : `Connexion ${name} échouée`, "info");
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [provider, name, toast]);

  if (!status) return <ConnectorSkeleton />;

  const connect = () => {
    window.location.href = `/api/integrations/${provider}/oauth`;
  };

  const needsReconnect = status.state === "error" || status.state === "expired";
  const canFallback =
    !!fallback && !!fallbackLabel && !locked && !status.connected && status.state !== "syncing";
  // Customers lead with the fallback; the owner (who can use OAuth) does not.
  const fallbackLeads = canFallback && fallbackPrimary && !isAdmin;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo>{logo}</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-head">{name}</h3>
            {locked ? (
              // Same colour and icon as the expired pill: one look for "wait".
              <Badge variant="warn">
                <Clock className="h-[15px] w-[15px]" aria-hidden /> Validation {reviewer} en cours
              </Badge>
            ) : (
              <StatusPill state={status.state} />
            )}
          </div>
          {locked ? (
            // The state comes first and in a readable size: a merchant who
            // reads "Connexion en un clic" and then meets an inert button has
            // been promised something and refused it in the same breath.
            <>
              <p className="text-label text-ink2">
                {reviewer} vérifie encore Nightflow. {reviewHint}
              </p>
              <p className="mt-0.5 text-label font-normal text-ink3">{description}</p>
            </>
          ) : (
            <p className="text-label font-normal text-ink2">
              {status.connected ? connectedHint : description}
            </p>
          )}
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — reconnectez votre compte."
          />
        </div>

        {locked || fallbackLeads ? null : status.state === "not_connected" ? (
          <Button size="sm" onClick={connect} className="flex-none">
            Se connecter avec {name}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {needsReconnect && (
              <Button size="sm" onClick={connect}>
                Reconnecter
              </Button>
            )}
            {showSync && <SyncButton onClick={() => connection.sync()} busy={busy} />}
            <DisconnectButton
              name={name}
              onClick={() => connection.disconnect(`${name} déconnecté`)}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {fallbackLeads ? (
        <>
          <div className="mt-4">{fallback}</div>
          <FoldedPath id={`${provider}-oauth-path`} label={oauthFoldLabel}>
            <div className="flex flex-col gap-3 sm:max-w-[520px]">
              <p className="text-label font-normal text-ink3">
                {name} n&apos;a pas encore activé la connexion en un clic pour Nightflow.
                Si elle échoue, la clé ci-dessus donne les mêmes données.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={connect}>
                  Se connecter avec {name}
                </Button>
                {needsReconnect && (
                  <DisconnectButton
                    name={name}
                    onClick={() => connection.disconnect(`${name} déconnecté`)}
                    disabled={busy}
                  />
                )}
              </div>
            </div>
          </FoldedPath>
        </>
      ) : (
        canFallback && (
          <FoldedPath id={`${provider}-fallback`} label={fallbackLabel as string}>
            {fallback}
          </FoldedPath>
        )
      )}
    </Card>
  );
}
