"use client";

import { useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const connect = async () => {
    if (!siteId.trim() || !apiKey.trim()) {
      toast("Renseigne le Site ID et la clé API Wix", "info");
      return;
    }
    const credential = `${siteId.trim()}::${apiKey.trim()}`;
    const data = await connection.connect(credential, "Connexion Wix impossible");
    if (!data) return;
    toast("Wix connecté ✓ — première synchronisation lancée");
    setSiteId("");
    setApiKey("");
    connection.reload();
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo
          accent="from-slate-200 to-slate-400"
          className="font-black text-accent-ink"
        >
          W
        </ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">Wix Stores</h3>
            <Badge variant="cool">Bêta</Badge>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink3">
            {status.connected
              ? "Produits & commandes importés depuis votre site Wix."
              : "Connectez votre boutique Wix : produits, commandes & revenus."}
          </p>
          <ConnectionNotes status={status} />
        </div>

        {status.state === "not_connected" ? (
          <div className="flex w-full flex-col gap-2 sm:max-w-[420px]">
            <input
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              placeholder="Site ID (Paramètres du site → ID du site)"
              className="field w-full rounded-xl px-3 py-2.5 text-[13px]"
            />
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                placeholder="Clé API Wix"
                className="field w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={connect} disabled={busy}>
                {busy ? "Vérification…" : "Connecter"}
              </PrimaryButton>
              <a
                href="https://manage.wix.com/account/api-keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-ink3 underline-offset-2 hover:text-ink hover:underline"
              >
                Créer une clé API <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} />
            <DisconnectButton
              onClick={() => connection.disconnect("Wix déconnecté")}
              disabled={busy}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
