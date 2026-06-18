"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const j = await res.json();
        if (j[provider]) setConnected(!!j[provider].connected);
      }
    } catch {
      /* ignore */
    }
  }, [provider]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    const key = apiKey.trim();
    if (!key) {
      toast(`Collez votre clé ${name}`, "info");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConnected(true);
        setApiKey("");
        toast(
          `${name} connecté ✓ — ${data.orders ?? 0} commandes, ${Math.round(
            (data.revenueCents ?? 0) / 100
          ).toLocaleString("fr-FR")} € importés`
        );
      } else {
        toast(data.error ?? `Connexion ${name} impossible`, "info");
      }
    } catch {
      toast(`Connexion ${name} impossible`, "info");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/integrations/${provider}/sync`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(
          `Synchronisé : ${data.orders ?? 0} commandes, ${Math.round(
            (data.revenueCents ?? 0) / 100
          ).toLocaleString("fr-FR")} € ✓`
        );
      } else {
        toast(data.error ?? "Synchronisation impossible", "info");
      }
    } catch {
      toast("Synchronisation impossible", "info");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      toast(`${name} déconnecté`);
      setConnected(false);
    } catch {
      toast("Impossible de déconnecter", "info");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span
          className={`grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br text-xl ${accent}`}
        >
          {logo}
        </span>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-extrabold">{name}</h3>
            {connected ? (
              <Badge variant="lime">
                <Check className="h-3 w-3" strokeWidth={3} /> Connecté
              </Badge>
            ) : (
              <Badge variant="cyan">Disponible</Badge>
            )}
          </div>
          <p className="text-[12px] text-ink-mut">
            {connected ? connectedHint : description}
          </p>
        </div>

        {connected ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={sync}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy ? "Synchro…" : "Synchroniser"}
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="rounded-xl border border-glass-border bg-glass px-3.5 py-2.5 text-[13px] font-semibold text-ink-dim transition hover:border-neon-pink hover:text-white disabled:opacity-60"
            >
              Déconnecter
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                type={reveal ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                className="glass-input w-full rounded-xl py-2.5 pl-9 pr-9 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Masquer la clé" : "Afficher la clé"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mut transition hover:text-white"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={connect}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Connexion…" : "Connecter"}
            </button>
          </div>
        )}
      </div>

      {!connected && helpHref && (
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-neon-cyansoft transition hover:text-white"
        >
          {helpLabel ?? "Où trouver ma clé ?"} ↗
        </a>
      )}
    </Card>
  );
}
