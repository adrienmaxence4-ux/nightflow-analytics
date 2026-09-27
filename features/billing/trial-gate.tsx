"use client";

import Link from "next/link";
import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UpgradeGate } from "@/features/billing/upgrade-gate";
import { PLAN_EVENT } from "@/hooks/use-plan";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";

/**
 * What a free account sees in place of a Pro-only feature.
 *
 * The 30 days are the whole promise of the landing ("gratuit, sans carte").
 * Until now they were only claimable from /billing, so the first thing a new
 * account met after "Connecter ma boutique" was a lock that read "Passer en
 * Pro". Same RPC and same anti-abuse checks as the billing page — only the
 * click moved to where the need is.
 *
 * When the trial was already used, the plain upgrade gate takes over.
 */
export function TrialGate({
  trialAvailable,
  loading,
  onActivated,
  title = "Active tes 30 jours gratuits pour connecter ta boutique",
  message = "Sans carte, sans engagement. L'essai s'arrête seul au bout de 30 jours si tu ne fais rien.",
}: {
  trialAvailable: boolean;
  loading: boolean;
  onActivated?: () => void;
  title?: string;
  message?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; settings?: boolean } | null>(null);

  if (loading) return null;
  if (!trialAvailable) {
    return (
      <UpgradeGate
        title="Connecte ta boutique avec le plan Pro"
        message="Tes 30 jours gratuits ont déjà été utilisés. Le plan Pro connecte Shopify, WooCommerce, Wix, Stripe, Klaviyo et Google Analytics pour 9 € par mois, sans engagement."
      />
    );
  }

  const activate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/trial", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        track("trial_started");
        toast("Essai activé — 30 jours offerts");
        window.dispatchEvent(new Event(PLAN_EVENT));
        onActivated?.();
        return;
      }
      setError({
        text: data.error ?? "Activation impossible. Réessaie dans un instant.",
        settings: res.status === 409 && /boutique/i.test(data.error ?? ""),
      });
    } catch {
      setError({ text: "Connexion impossible. Vérifie ton réseau et réessaie." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
      <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-accent">
        <Gift className="h-7 w-7 text-accent-ink" strokeWidth={2.2} aria-hidden />
      </span>
      <div>
        <h3 className="text-title">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-body text-ink2">{message}</p>
      </div>
      <Button size="lg" onClick={activate} loading={busy} className="w-full sm:w-auto">
        {busy ? "Activation…" : "Activer mes 30 jours gratuits"}
      </Button>
      {error && (
        <p role="alert" className="max-w-md text-label font-medium text-bad">
          {error.text}
          {error.settings && (
            <>
              {" "}
              <Link href="/settings" className="underline underline-offset-2">
                Ouvrir les réglages
              </Link>
            </>
          )}
        </p>
      )}
      <p className="text-label font-normal text-ink3">
        Le plan Pro vaut 9 € par mois après l&apos;essai. Rien n&apos;est prélevé sans que tu
        ajoutes une carte toi-même.
      </p>
    </Card>
  );
}
