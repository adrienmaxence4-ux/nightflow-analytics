"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusPill } from "@/features/integrations/status-pill";
import {
  ConnectionNotes,
  ConnectorLogo,
  ConnectorSkeleton,
  DisconnectButton,
  SecretInput,
  SyncButton,
} from "@/features/integrations/connector-ui";
import { euros, useConnection } from "@/features/integrations/use-connection";
import { useToast } from "@/hooks/use-toast";

/**
 * Generic connector for API-KEY based providers (Windsor, PayPal, …).
 * Each logged-in user pastes THEIR OWN key — the data synced is theirs,
 * isolated by RLS. Drives the shared /api/integrations/[provider] routes.
 */
export interface ApiKeyConnectProps {
  /** Provider id — must match a key in the server registry (e.g. "windsor"). */
  provider: string;
  name: string;
  logo: string;
  description: string;
  /** Connected-state description, e.g. "Dépense & ROAS par régie affichés dans Marketing." */
  connectedHint: string;
  /** Visible label of the key field; defaults to "Clé API {name}". */
  keyLabel?: string;
  /** What to paste, shown under the field, e.g. "Format : idClient::secretClient". */
  keyHint: string;
  /** Optional doc link where the user finds/creates the key. */
  helpHref?: string;
  helpLabel?: string;
  /**
   * The key is accepted and events are stored, but no page reads them yet.
   * Said on the card so the merchant is not promised a chart that isn't there.
   */
  collectOnly?: boolean;
  /**
   * Form only, no card and no header — for a key path folded inside another
   * card of the same provider (Stripe OAuth + restricted key). Renders nothing
   * once connected: the host card shows the status.
   */
  compact?: boolean;
}

export function ApiKeyConnect({
  provider,
  name,
  logo,
  description,
  connectedHint,
  keyLabel,
  keyHint,
  helpHref,
  helpLabel,
  collectOnly = false,
  compact = false,
}: ApiKeyConnectProps) {
  const toast = useToast();
  const connection = useConnection(provider);
  const { status, busy } = connection;
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);

  if (!status) return compact ? null : <ConnectorSkeleton variant="form" />;

  const connect = async () => {
    const key = apiKey.trim();
    if (!key) {
      setKeyError(`Collez votre clé ${name}.`);
      return;
    }
    setKeyError(null);
    const data = await connection.connect(key, `Connexion ${name} impossible`);
    if (!data) return;
    setApiKey("");
    // Flip the card immediately, then let the real status catch up.
    connection.setStatus((s) => ({ ...(s ?? status), connected: true, state: "connected" }));
    if (data.syncWarning) {
      // The key itself was accepted — the card stays "Connecté" — but the
      // first import failed, so say that instead of a false "0 € importés ✓".
      toast(`${name} connecté, mais le premier import a échoué : ${data.syncWarning}`, "info");
    } else {
      const noun = data.resultNoun ?? "commande(s)";
      const revenueClause =
        data.tracksRevenue === false ? "" : `, ${euros(data.revenueCents)} importés`;
      toast(`${name} connecté ✓ — ${data.orders ?? 0} ${noun}${revenueClause}`);
    }
    connection.reload();
  };

  const needsReconnect = status.state === "error" || status.state === "expired";
  // A broken key is fixed by pasting a new one, so the field comes back.
  const showKeyForm = status.state === "not_connected" || needsReconnect;
  const fieldId = `${provider}-api-key${compact ? "-compact" : ""}`;

  const keyForm = (
    <div className="flex w-full flex-col gap-3 sm:max-w-[520px]">
      <Field id={fieldId} label={keyLabel ?? `Clé API ${name}`} hint={keyHint} error={keyError}>
        <SecretInput
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          disabled={busy}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={connect} loading={busy}>
          {needsReconnect ? "Reconnecter" : "Connecter"}
        </Button>
        {needsReconnect && !compact && (
          <DisconnectButton
            name={name}
            onClick={() => connection.disconnect(`${name} déconnecté`)}
            disabled={busy}
          />
        )}
        {helpHref && (
          <a
            href={helpHref}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {helpLabel ?? "Où trouver ma clé ?"} ↗
          </a>
        )}
      </div>
    </div>
  );

  if (compact) return showKeyForm ? keyForm : null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo>{logo}</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-head">{name}</h3>
            <StatusPill state={status.state} />
            {collectOnly && <Badge variant="cool">Bêta — collecte seule</Badge>}
          </div>
          <p className="text-label font-normal text-ink2">
            {status.connected ? connectedHint : description}
          </p>
          {collectOnly && (
            <p className="mt-0.5 text-label font-normal text-ink3">
              Données collectées, affichage à venir.
            </p>
          )}
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — collez une nouvelle clé ci-dessous."
          />
        </div>

        {!showKeyForm && (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} variant="primary" />
            <DisconnectButton
              name={name}
              onClick={() => connection.disconnect(`${name} déconnecté`)}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {showKeyForm && <div className="mt-4">{keyForm}</div>}
    </Card>
  );
}
