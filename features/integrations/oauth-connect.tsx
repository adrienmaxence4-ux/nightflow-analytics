"use client";

import { useEffect } from "react";
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
import { useIsAdmin } from "@/hooks/use-admin";
import { Badge } from "@/components/ui/badge";

/**
 * One-click OAuth connector ("Se connecter avec Stripe"). No API key: the user
 * authorises their own account and we store the returned token (RLS-isolated).
 * Drives /api/integrations/[provider]/oauth + the shared sync/disconnect routes.
 */
export interface OAuthConnectProps {
  provider: string;
  name: string;
  logo: string;
  accent: string;
  description: string;
  connectedHint: string;
  /** Show the manual "Synchroniser" button (false for live-data providers). */
  showSync?: boolean;
  /**
   * The platform grants this connector standard access only: it works for the
   * app owner and fails for everyone else until Meta approves advanced access.
   * Rather than hide it — the roadmap is worth showing — the card says so and
   * the button is inert for anyone but the owner.
   */
  reviewPending?: boolean;
}

/**
 * Why the callback stopped, in the customer's words. Keys match the `reason`
 * the /oauth/callback route appends when it bails out.
 */
const OAUTH_FAILURES: Record<string, string> = {
  token:
    "la plateforme a refusé l'échange. La clé secrète de l'app est probablement incorrecte ou tronquée.",
  state: "la session d'autorisation a expiré. Relance la connexion.",
  denied: "autorisation refusée.",
  params: "réponse incomplète de la plateforme. Réessaie.",
  store: "aucune boutique rattachée à ton compte.",
  provider: "connecteur inconnu.",
  supabase: "base de données indisponible.",
};

export function OAuthConnect({
  provider,
  name,
  logo,
  accent,
  description,
  connectedHint,
  showSync = true,
  reviewPending = false,
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
    if (outcome === "connected") toast(`${name} connecté ✓`);
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

  const connect = () => {
    window.location.href = `/api/integrations/${provider}/oauth`;
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo accent={accent}>{logo}</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-extrabold">{name}</h3>
            {locked ? (
              <Badge variant="violet">Validation Meta en cours</Badge>
            ) : (
              <StatusPill state={status.state} />
            )}
          </div>
          <p className="text-[12px] text-ink-mut">
            {locked
              ? `${description} Meta doit encore valider Nightflow pour les comptes tiers — en attendant, la carte « Régies publicitaires » couvre les mêmes données.`
              : status.connected
                ? connectedHint
                : description}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — reconnecte ton compte."
          />
        </div>

        {locked ? (
          <button
            disabled
            title="Disponible une fois la validation Meta obtenue"
            className="flex-none cursor-not-allowed rounded-xl border border-glass-border bg-glass px-5 py-2.5 text-[13px] font-bold text-ink-mut"
          >
            Bientôt
          </button>
        ) : status.state === "not_connected" ? (
          <PrimaryButton onClick={connect} className="flex items-center gap-2 px-5">
            Se connecter avec {name}
          </PrimaryButton>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(status.state === "error" || status.state === "expired") && (
              <PrimaryButton onClick={connect}>Reconnecter</PrimaryButton>
            )}
            {showSync && <SyncButton onClick={() => connection.sync()} busy={busy} />}
            <DisconnectButton
              onClick={() => connection.disconnect(`${name} déconnecté`)}
              disabled={busy}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
