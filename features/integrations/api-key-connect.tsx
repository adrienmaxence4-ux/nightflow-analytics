"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ConnectorLogo,
  DisconnectButton,
  PrimaryButton,
  SyncButton,
} from "@/features/integrations/connector-ui";
import { useConnection } from "@/features/integrations/use-connection";

/**
 * Generic connector for API-KEY based providers (Stripe, Klaviyo, …).
 * Each logged-in user pastes THEIR OWN key — the data synced is theirs,
 * isolated by RLS. Drives the shared /api/integrations/[provider] routes.
 */
export interface ApiKeyConnectProps {
  /** Provider id — must match a key in the server registry (e.g. "stripe"). */
  provider: string;
  name: string;
  logo: string;
  /** Tailwind gradient classes for the logo tile, e.g. "from-indigo-400 to-violet-500". */
  accent: string;
  description: string;
  /** Connected-state description, e.g. "Revenus & commandes importés depuis Stripe." */
  connectedHint: string;
  placeholder: string;
  /** Optional doc link where the user finds/creates the key. */
  helpHref?: string;
  helpLabel?: string;
}

export function ApiKeyConnect({
  provider,
  name,
  logo,
  accent,
  description,
  connectedHint,
  placeholder,
  helpHref,
  helpLabel,
}: ApiKeyConnectProps) {
  const toast = useToast();
  const connection = useConnection(provider);
  const { status, busy } = connection;
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);

  const connect = async () => {
    const key = apiKey.trim();
    if (!key) {
      toast(`Collez votre clé ${name}`, "info");
      return;
    }
    const data = await connection.connect(key, `Connexion ${name} impossible`);
    if (!data) return;
    setApiKey("");
    // Flip the card immediately, then let the real status catch up.
    connection.setStatus((s) => ({ ...s, connected: true, state: "connected" }));
    const imported = Math.round((data.revenueCents ?? 0) / 100).toLocaleString(
      "fr-FR"
    );
    toast(`${name} connecté ✓ — ${data.orders ?? 0} commandes, ${imported} € importés`);
    connection.reload();
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <ConnectorLogo accent={accent}>{logo}</ConnectorLogo>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">{name}</h3>
            {status.connected ? (
              <Badge variant="good">
                <Check className="h-3 w-3" strokeWidth={3} /> Connecté
              </Badge>
            ) : (
              <Badge variant="cool">Disponible</Badge>
            )}
          </div>
          <p className="text-[12px] text-ink3">
            {status.connected ? connectedHint : description}
          </p>
        </div>

        {status.connected ? (
          <div className="flex flex-wrap items-center gap-2">
            <SyncButton onClick={() => connection.sync()} busy={busy} variant="primary" />
            <DisconnectButton
              onClick={() => connection.disconnect(`${name} déconnecté`)}
              disabled={busy}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                type={reveal ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                className="field w-full rounded-xl py-2.5 pl-9 pr-9 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Masquer la clé" : "Afficher la clé"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3 transition hover:text-ink"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PrimaryButton onClick={connect} disabled={busy}>
              {busy ? "Connexion…" : "Connecter"}
            </PrimaryButton>
          </div>
        )}
      </div>

      {!status.connected && helpHref && (
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-text transition hover:text-ink"
        >
          {helpLabel ?? "Où trouver ma clé ?"} ↗
        </a>
      )}
    </Card>
  );
}
