"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Lock,
  Plug,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { SuggestedAction } from "@/types";

/**
 * The confirmation panel behind "Appliquer".
 *
 * The product promise is that Nightflow does the work — but never blind: the
 * panel opens on a dry run against the live store, shows the exact before →
 * after, lets the merchant adjust the number, and keeps an undo within reach
 * once the change is live. Consent happens on a real diff, not on a summary.
 */

interface ActionChange {
  label: string;
  before: string;
  after: string;
}

interface ActionPlan {
  id: string;
  title: string;
  intro: string;
  icon: string;
  providerLabel: string;
  changes: ActionChange[];
  warnings: string[];
  reversible: boolean;
}

type Phase = "planning" | "ready" | "applying" | "done" | "error";

/** Failure codes that deserve a dedicated way out rather than a retry. */
const RECOVERY: Record<string, { href: string; label: string; icon: typeof Plug }> = {
  gated: { href: "/billing", label: "Voir les offres", icon: Lock },
  no_provider: { href: "/integrations", label: "Connecter ma boutique", icon: Plug },
  write_forbidden: {
    href: "/integrations",
    label: "Autoriser les modifications",
    icon: ShieldCheck,
  },
};

export function ApplySheet({
  action,
  sourceRef,
  open,
  onClose,
  onApplied,
}: {
  action: SuggestedAction | null;
  sourceRef?: string;
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("planning");
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [value, setValue] = useState<number>(action?.editable?.value ?? 0);
  const [undoing, setUndoing] = useState(false);

  const field = action?.editable;
  // Prices live in cents everywhere in the app; the field shows euros.
  const display = field?.money ? value / 100 : value;

  const runPlan = useCallback(
    async (override?: number) => {
      if (!action) return;
      setPhase("planning");
      setError(null);
      const params = { ...action.params };
      if (field && override != null) params[field.field] = override;
      try {
        const res = await fetch("/api/actions/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: action.kind, ...params, sourceRef }),
        });
        const json = (await res.json()) as {
          plan?: ActionPlan;
          error?: string;
          code?: string;
        };
        if (!res.ok || !json.plan) {
          setError({
            message: json.error ?? "Impossible de préparer l'action.",
            code: json.code ?? "platform",
          });
          setPhase("error");
          return;
        }
        setPlan(json.plan);
        setPhase("ready");
      } catch {
        setError({ message: "Connexion perdue — réessaie.", code: "platform" });
        setPhase("error");
      }
    },
    [action, field, sourceRef]
  );

  // A fresh dry run every time the panel opens: the store may have changed
  // since the recommendation was generated.
  useEffect(() => {
    if (!open || !action) return;
    setPlan(null);
    setAppliedId(null);
    setUndoing(false);
    setValue(action.editable?.value ?? 0);
    runPlan();
    // runPlan is stable for a given action; re-running on every render would
    // hammer the store with dry runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, action]);

  async function apply() {
    if (!plan) return;
    setPhase("applying");
    try {
      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const json = (await res.json()) as {
        action?: { id: string };
        error?: string;
        code?: string;
      };
      if (!res.ok || !json.action) {
        setError({
          message: json.error ?? "La modification a échoué.",
          code: json.code ?? "platform",
        });
        setPhase("error");
        return;
      }
      setAppliedId(json.action.id);
      setPhase("done");
      toast("Modification appliquée sur ta boutique ✨");
      onApplied?.();
    } catch {
      setError({ message: "Connexion perdue — réessaie.", code: "platform" });
      setPhase("error");
    }
  }

  async function undo() {
    if (!appliedId) return;
    setUndoing(true);
    try {
      const res = await fetch("/api/actions/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: appliedId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(json.error ?? "Annulation impossible.", "info");
        return;
      }
      toast("Modification annulée — ta boutique est revenue à l'état initial.");
      onApplied?.();
      onClose();
    } catch {
      toast("Connexion perdue — réessaie.", "info");
    } finally {
      setUndoing(false);
    }
  }

  const recovery = error ? RECOVERY[error.code] : undefined;

  return (
    <Sheet open={open} onClose={onClose}>
      {action && (
        <div className="pr-8">
          <header className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-border bg-glass-2 text-xl">
              {plan?.icon ?? "⚡"}
            </span>
            <div>
              <h2 className="text-[17px] font-black leading-snug">
                {plan?.title ?? action.preview}
              </h2>
              <p className="mt-1 text-[12px] text-ink-mut">
                {phase === "planning"
                  ? "Vérification de ta boutique…"
                  : phase === "error"
                    ? "Aucune modification n'a été faite."
                    : plan
                      ? `Nightflow va écrire sur ${plan.providerLabel}.`
                      : ""}
              </p>
            </div>
          </header>

          {phase === "planning" && <PlanSkeleton />}

          {phase === "error" && error && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 rounded-xl border border-neon-pink/35 bg-neon-pink/8 p-4">
                <AlertTriangle className="h-4 w-4 flex-none text-neon-pinksoft" />
                <p className="text-[13px] leading-relaxed text-ink-dim">{error.message}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recovery ? (
                  <Link href={recovery.href}>
                    <Button variant="primary" size="sm">
                      <recovery.icon className="h-4 w-4" />
                      {recovery.label}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => runPlan(value)}>
                    Réessayer
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {(phase === "ready" || phase === "applying") && plan && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-ink-dim">{plan.intro}</p>

              {field && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mut">
                    {field.label}
                  </span>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={String(display)}
                      min={field.money ? field.min / 100 : field.min}
                      max={field.money ? field.max / 100 : field.max}
                      step={field.money ? 0.1 : field.step}
                      disabled={phase === "applying"}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setValue(field.money ? Math.round(n * 100) : Math.round(n));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-none"
                      disabled={phase === "applying"}
                      onClick={() => runPlan(value)}
                    >
                      Recalculer
                    </Button>
                  </div>
                  <span className="text-[11px] text-ink-mut">
                    {field.money ? "en euros" : field.suffix}
                  </span>
                </label>
              )}

              <ChangeList changes={plan.changes} />

              {plan.warnings.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {plan.warnings.map((w) => (
                    <li
                      key={w}
                      className="flex gap-2.5 rounded-xl border border-neon-amber/30 bg-neon-amber/8 p-3"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-neon-amber" />
                      <span className="text-[12px] leading-relaxed text-ink-dim">{w}</span>
                    </li>
                  ))}
                </ul>
              )}

              {plan.reversible && (
                <p className="flex items-center gap-2 text-[12px] text-neon-lime">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Annulable en un clic après application.
                </p>
              )}

              <div className="mt-1 flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  loading={phase === "applying"}
                  onClick={apply}
                >
                  Appliquer maintenant
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={phase === "applying"}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {phase === "done" && plan && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="flex gap-3 rounded-xl border border-neon-lime/35 bg-neon-lime/8 p-4">
                <Check className="h-4 w-4 flex-none text-neon-lime" />
                <p className="text-[13px] font-semibold leading-relaxed text-ink">
                  C&apos;est fait — la modification est en ligne sur {plan.providerLabel}.
                </p>
              </div>

              <ChangeList changes={plan.changes} />

              <div className="flex gap-2">
                {plan.reversible && (
                  <Button variant="ghost" loading={undoing} onClick={undo}>
                    <RotateCcw className="h-4 w-4" />
                    Annuler la modification
                  </Button>
                )}
                <Button variant="primary" className="flex-1" onClick={onClose}>
                  Terminé
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The before → after table. The whole feature's trust lives in this block. */
function ChangeList({ changes }: { changes: ActionChange[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {changes.map((c) => (
        <li
          key={c.label}
          className="rounded-xl border border-glass-hi bg-glass-2 px-3.5 py-3"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mut">
            {c.label}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-[13px] text-ink-mut line-through">{c.before}</span>
            <ArrowRight className="h-3.5 w-3.5 flex-none text-neon-cyan" aria-hidden />
            <span className="text-[14px] font-bold text-white">{c.after}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-md" />
      <span className="sr-only">Vérification de ta boutique en cours…</span>
    </div>
  );
}
