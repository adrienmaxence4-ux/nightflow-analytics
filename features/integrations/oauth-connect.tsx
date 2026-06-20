"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
}

export function OAuthConnect({
  provider,
  name,
  logo,
  accent,
  description,
  connectedHint,
}: OAuthConnectProps) {
  const toast = useToast();
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

  // Surface the result of the OAuth redirect (?stripe=connected|error|…).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get(provider);
    if (!r) return;
    if (r === "connected") toast(`${name} connecté ✓`);
    else if (r === "notconfigured")
      toast(`${name} OAuth pas encore configuré`, "info");
    else if (r === "error") toast(`Connexion ${name} échouée`, "info");
    window.history.replaceState({}, "", window.location.pathname);
  }, [provider, name, toast]);

  const connect = () => {
    window.location.href = `/api/integrations/${provider}/oauth`;
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
          <button
            onClick={connect}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
          >
            Se connecter avec {name}
          </button>
        )}
      </div>
    </Card>
  );
}
