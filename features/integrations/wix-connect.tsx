"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/features/integrations/status-pill";
import {
  ConnectionNotes,
  ConnectorLogo,
  ConnectorSkeleton,
  DisconnectButton,
  SecretInput,
  SyncButton,
} from "@/features/integrations/connector-ui";
import { useConnection } from "@/features/integrations/use-connection";

/**
 * Wix Stores connector (BÊTA) — the customer pastes their Site ID + an API key
 * created on manage.wix.com/account/api-keys. Both are sent as one composite
 * credential to the generic keyed-provider connect route (validated server-side,
 * encrypted at rest). The user types their own secret — we never generate it.
 */
export function WixConnect() {
  const toast = useToast();
  const connection = useConnection("wix");
  const { status, busy } = connection;
  const [siteId, setSiteId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [errors, setErrors] = useState<{ siteId?: string; apiKey?: string }>({});

  if (!status) return <ConnectorSkeleton variant="form" />;

  const connect = async () => {
    const next: typeof errors = {};
    if (!siteId.trim()) next.siteId = "Indiquez le Site ID de votre site Wix.";
    if (!apiKey.trim()) next.apiKey = "Collez la clé API créée sur Wix.";
    setErrors(next);
    if (next.siteId || next.apiKey) return;
    const credential = `${siteId.trim()}::${apiKey.trim()}`;
    const data = await connection.connect(credential, "Connexion Wix impossible");
    if (!data) return;
    toast("Wix connecté ✓ — première synchronisation lancée");
    setSiteId("");
    setApiKey("");
    connection.reload();
  };

  const needsReconnect = status.state === "error" || status.state === "expired";
  const showForm = status.state === "not_connected" || needsReconnect;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo>W</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-head">Wix Stores</h3>
            <StatusPill state={status.state} />
            <Badge variant="cool">Bêta</Badge>
          </div>
          <p className="text-label font-normal text-ink2">
            {status.connected
              ? "Produits & commandes importés depuis votre site Wix."
              : "Connectez votre boutique Wix : produits, commandes & revenus."}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — collez une nouvelle clé ci-dessous."
          />
        </div>

        {!showForm && (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} />
            <DisconnectButton
              name="Wix"
              onClick={() => connection.disconnect("Wix déconnecté")}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {showForm && (
        <div className="mt-4 flex w-full flex-col gap-3 sm:max-w-[520px]">
          <Field
            id="wix-site-id"
            label="Site ID"
            hint="Sur Wix : Paramètres du site → ID du site."
            error={errors.siteId}
          >
            <Input
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </Field>
          <Field
            id="wix-api-key"
            label="Clé API Wix"
            hint="Créée sur manage.wix.com → Clés API."
            error={errors.apiKey}
          >
            <SecretInput
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              disabled={busy}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={connect} loading={busy}>
              {needsReconnect ? "Reconnecter" : "Connecter Wix"}
            </Button>
            {needsReconnect && (
              <DisconnectButton
                name="Wix"
                onClick={() => connection.disconnect("Wix déconnecté")}
                disabled={busy}
              />
            )}
            <a
              href="https://manage.wix.com/account/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Créer une clé API ↗
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
