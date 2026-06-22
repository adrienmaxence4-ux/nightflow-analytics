"use client";

import { useState } from "react";
import { Database, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Shown when a page is displaying mock data. Lets a logged-in user seed their
 * real Supabase DB with the MoonStore demo in one click, then refresh.
 */
export function DemoBanner({
  source,
  onSeeded,
}: {
  source: "db" | "mock" | null;
  onSeeded?: () => void;
}) {
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const [busy, setBusy] = useState(false);

  // Only shown to the project owner: loading MoonStore into a real DB is a
  // test convenience, not something a real customer should ever trigger.
  if (source !== "mock" || !isAdmin) return null;

  const seed = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (res.status === 401) {
        toast("Connectez-vous pour remplir votre base", "info");
        return;
      }
      if (res.ok) {
        toast("Données MoonStore chargées dans votre base ✓");
        onSeeded?.();
      } else {
        toast("Le chargement a échoué", "info");
      }
    } catch {
      toast("Le chargement a échoué", "info");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-hi px-4 py-3 [background:linear-gradient(110deg,rgba(154,107,255,0.14),rgba(61,242,255,0.06))]">
      <Database className="h-4 w-4 flex-none text-neon-cyansoft" />
      <span className="text-[13px] text-ink-dim">
        Vous voyez des <b className="text-white">données de démonstration</b>.
        Chargez MoonStore dans votre vraie base Supabase pour tout activer.
      </span>
      <button
        onClick={seed}
        disabled={busy}
        className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-3.5 py-2 text-xs font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {busy ? "Chargement…" : "Charger les données démo"}
      </button>
    </div>
  );
}
