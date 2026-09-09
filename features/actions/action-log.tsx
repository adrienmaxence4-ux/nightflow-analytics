"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  FlaskConical,
  History,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * "Ce que Nightflow a fait sur ta boutique" — the audit trail.
 *
 * An assistant with write access is only acceptable if every change it made is
 * visible and reversible after the fact, not just at the moment of the click.
 */

interface LoggedAction {
  id: string;
  summary: string;
  status: "applied" | "failed" | "undone" | "planned";
  reversible: boolean;
  /** Applied to the demo catalogue rather than a real storefront. */
  simulated: boolean;
  error: string | null;
  executedAt: string | null;
  createdAt: string;
}

const STATUS = {
  applied: { icon: Check, tone: "text-good", label: "Appliquée" },
  undone: { icon: Undo2, tone: "text-ink3", label: "Annulée" },
  failed: { icon: AlertTriangle, tone: "text-bad", label: "Échouée" },
  planned: { icon: History, tone: "text-ink3", label: "En attente" },
} as const;

function when(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActionLog({ refreshKey = 0 }: { refreshKey?: number }) {
  const toast = useToast();
  const [actions, setActions] = useState<LoggedAction[]>([]);
  const [undoing, setUndoing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/actions");
      if (!res.ok) return;
      const json = (await res.json()) as { actions?: LoggedAction[] };
      setActions(json.actions ?? []);
    } catch {
      /* the log is secondary — never surface a fetch hiccup here */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function undo(id: string) {
    setUndoing(id);
    try {
      const res = await fetch("/api/actions/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: id }),
      });
      const json = (await res.json()) as { error?: string };
      const undone = actions.find((a) => a.id === id);
      toast(
        res.ok
          ? undone?.simulated
            ? "Simulation annulée — tes données de démo sont revenues à l'état initial."
            : "Modification annulée — ta boutique est revenue à l'état initial."
          : json.error ?? "Annulation impossible.",
        res.ok ? "success" : "info"
      );
      await load();
    } catch {
      toast("Connexion perdue — réessaie.", "info");
    } finally {
      setUndoing(null);
    }
  }

  if (actions.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-accent-text" aria-hidden />
        <h2 className="text-[10px] font-bold tracking-[1.6px] text-ink3">
          CE QUE NIGHTFLOW A FAIT
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {actions.map((a) => {
          const s = STATUS[a.status];
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-3"
            >
              <s.icon className={`h-4 w-4 flex-none ${s.tone}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  <span className="truncate">{a.summary}</span>
                  {a.simulated && (
                    <span className="inline-flex flex-none items-center gap-1 rounded-md bg-panel2 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.06em] text-cool">
                      <FlaskConical className="h-2.5 w-2.5" aria-hidden />
                      Démo
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink3">
                  {s.label} · {when(a.executedAt ?? a.createdAt)}
                  {a.error ? ` · ${a.error}` : ""}
                </p>
              </div>
              {a.status === "applied" && a.reversible && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={undoing === a.id}
                  onClick={() => undo(a.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Annuler
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
