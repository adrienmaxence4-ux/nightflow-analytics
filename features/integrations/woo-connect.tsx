"use client";

import { useState } from "react";
import { Globe, KeyRound } from "lucide-react";
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
 * WooCommerce connector — the customer pastes their store URL + a READ-ONLY
 * REST key pair (WooCommerce → Réglages → Avancé → API REST). Sent as one
 * composite credential to the generic keyed-provider connect route (validated
 * server-side, encrypted at rest). The user types their own secret — we never
 * generate or display it.
 */
export function WooConnect() {
  const toast = useToast();
  const connection = useConnection("woocommerce");
  const { status, busy } = connection;
  const [url, setUrl] = useState("");
  const [ck, setCk] = useState("");
  const [cs, setCs] = useState("");

  /** Accepts "maboutique.fr" as well as a full URL, always ends up HTTPS. */
  const normalizeStoreUrl = (raw: string): string => {
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const connect = async () => {
    const base = normalizeStoreUrl(url);
    if (!/^https:\/\/.+\..+/.test(base)) {
      toast("Entre l'adresse HTTPS de ta boutique, ex. https://maboutique.fr", "info");
      return;
    }
    if (!ck.trim().startsWith("ck_") || !cs.trim().startsWith("cs_")) {
      toast("La clé commence par ck_ et le secret par cs_", "info");
      return;
    }
    const credential = `${base}::${ck.trim()}::${cs.trim()}`;
    const data = await connection.connect(
      credential,
      "Connexion WooCommerce impossible"
    );
    if (!data) return;
    toast("WooCommerce connecté ✓ — première synchronisation lancée");
    setUrl("");
    setCk("");
    setCs("");
    connection.reload();
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo accent="from-purple-400 to-purple-700">🛒</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">WooCommerce</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-[12px] text-ink-mut">
            {status.connected
              ? "Produits & commandes importés depuis votre boutique WordPress."
              : "Boutique WordPress ? Connectez WooCommerce : produits, commandes & revenus."}
          </p>
          <ConnectionNotes status={status} />
        </div>

        {status.state === "not_connected" ? (
          <div className="flex w-full flex-col gap-2 sm:max-w-[420px]">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://maboutique.fr"
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <input
              value={ck}
              onChange={(e) => setCk(e.target.value)}
              placeholder="Consumer key (ck_…)"
              className="glass-input w-full rounded-xl px-3 py-2.5 text-[13px]"
            />
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={cs}
                onChange={(e) => setCs(e.target.value)}
                type="password"
                placeholder="Consumer secret (cs_…)"
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-[13px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={connect} disabled={busy}>
                {busy ? "Vérification…" : "Connecter"}
              </PrimaryButton>
              <span className="text-[11px] text-ink-mut">
                WooCommerce → Réglages → Avancé → API REST. Choisis
                « Lecture/Écriture » pour que le Copilot puisse appliquer ses
                recommandations ; « Lecture » suffit pour l&apos;analyse seule.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} />
            <DisconnectButton
              onClick={() => connection.disconnect("WooCommerce déconnecté")}
              disabled={busy}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
