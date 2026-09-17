"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [errors, setErrors] = useState<{ url?: string; ck?: string; cs?: string }>({});

  /** Accepts "maboutique.fr" as well as a full URL, always ends up HTTPS. */
  const normalizeStoreUrl = (raw: string): string => {
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  if (!status) return <ConnectorSkeleton variant="form" />;

  const connect = async () => {
    const base = normalizeStoreUrl(url);
    const next: typeof errors = {};
    if (!/^https:\/\/.+\..+/.test(base)) {
      next.url = "Entrez l'adresse HTTPS de votre boutique, ex. https://maboutique.fr";
    }
    if (!ck.trim().startsWith("ck_")) next.ck = "La clé commence par ck_";
    if (!cs.trim().startsWith("cs_")) next.cs = "Le secret commence par cs_";
    setErrors(next);
    if (next.url || next.ck || next.cs) return;
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

  const needsReconnect = status.state === "error" || status.state === "expired";
  const showForm = status.state === "not_connected" || needsReconnect;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo>Wc</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-head">WooCommerce</h3>
            <StatusPill state={status.state} />
          </div>
          <p className="text-label font-normal text-ink2">
            {status.connected
              ? "Produits & commandes importés depuis votre boutique WordPress."
              : "Boutique WordPress ? Connectez WooCommerce : produits, commandes & revenus."}
          </p>
          <ConnectionNotes
            status={status}
            expiredHint="Jeton expiré — collez de nouvelles clés ci-dessous."
          />
        </div>

        {!showForm && (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} />
            <DisconnectButton
              name="WooCommerce"
              onClick={() => connection.disconnect("WooCommerce déconnecté")}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {showForm && (
        <div className="mt-4 flex w-full flex-col gap-3 sm:max-w-[520px]">
          <Field
            id="woo-url"
            label="Adresse de votre boutique"
            hint="Ex. https://maboutique.fr"
            error={errors.url}
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </Field>
          <Field
            id="woo-consumer-key"
            label="Consumer key"
            hint="Commence par ck_"
            error={errors.ck}
          >
            <Input
              value={ck}
              onChange={(e) => setCk(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              disabled={busy}
            />
          </Field>
          <Field
            id="woo-consumer-secret"
            label="Consumer secret"
            hint="Commence par cs_"
            error={errors.cs}
          >
            <SecretInput
              value={cs}
              onChange={(e) => setCs(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              disabled={busy}
            />
          </Field>
          <p className="text-label font-normal text-ink3">
            Clés à créer dans WooCommerce → Réglages → Avancé → API REST.
            Choisissez « Lecture/Écriture » pour que le Copilot puisse appliquer
            ses recommandations ; « Lecture » suffit pour l&apos;analyse seule.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={connect} loading={busy}>
              {needsReconnect ? "Reconnecter" : "Connecter WooCommerce"}
            </Button>
            {needsReconnect && (
              <DisconnectButton
                name="WooCommerce"
                onClick={() => connection.disconnect("WooCommerce déconnecté")}
                disabled={busy}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
