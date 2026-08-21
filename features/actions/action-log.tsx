"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, History, RotateCcw, Undo2 } from "lucide-react";
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
  error: string | null;
  executedAt: string | null;
  createdAt: string;
}

const STATUS = {
  applied: { icon: Check, tone: "text-neon-lime", label: "Appliquée" },
  undone: { icon: Undo2, tone: "text-ink-mut", label: "Annulée" },
  failed: { icon: AlertTriangle, tone: "text-neon-pinksoft", label: "Échouée" },
  planned: { icon: History, tone: "text-ink-mut", label: "En attente" },
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
      toast(
        res.ok
          ? "Modification annulée — ta boutique est revenue à l'état initial."
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
        <History className="h-4 w-4 text-neon-cyansoft" aria-hidden />
        <h2 className="text-[10px] font-bold tracking-[1.6px] text-ink-mut">
          CE QUE NIGHTFLOW A FAIT
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {actions.map((a) => {
          const s = STATUS[a.status];
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-glass-border bg-glass px-3.5 py-3"
            >
              <s.icon className={`h-4 w-4 flex-none ${s.tone}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{a.summary}</p>
                <p className="mt-0.5 text-[11px] text-ink-mut">
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
