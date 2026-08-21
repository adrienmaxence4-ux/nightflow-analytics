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
}

export function OAuthConnect({
  provider,
  name,
  logo,
  accent,
  description,
  connectedHint,
  showSync = true,
}: OAuthConnectProps) {
  const toast = useToast();
  const connection = useConnection(provider);
  const { status, busy } = connection;

  // Surface the result of the OAuth redirect (?stripe=connected|error|…).
  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get(provider);
    if (!outcome) return;
    if (outcome === "connected") toast(`${name} connecté ✓`);
    else if (outcome === "notconfigured")
      toast(`${name} OAuth pas encore configuré`, "info");
    else if (outcome === "error") toast(`Connexion ${name} échouée`, "info");
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
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">{name}</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink-mut">
            {status.connected ? connectedHint : description}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — reconnecte ton compte."
          />
        </div>

        {status.state === "not_connected" ? (
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
