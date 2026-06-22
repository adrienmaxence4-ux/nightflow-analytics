"use client";

import { useState } from "react";
import { FlaskConical, ChevronDown } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";

/**
 * ADMIN-ONLY test panel. Lets the owner inject data that triggers each detection
 * in isolation (revenue drop, stock-out, unprofitable campaign, …) so every
 * alert/insight type can be tested separately. Hidden from real customers
 * (gated by useIsAdmin → /api/me → ADMIN_EMAILS).
 */
const SCENARIOS = [
  { id: "healthy", label: "Tout au vert", icon: "✅", hint: "Aucune anomalie + campagnes gagnantes" },
  { id: "revenue_drop", label: "Chute de CA", icon: "📉", hint: "Alerte critique CA en baisse" },
  { id: "conversion_drop", label: "Baisse de conversion", icon: "🎯", hint: "Alerte conversion en baisse" },
  { id: "stockout", label: "Rupture de stock", icon: "🚨", hint: "Critique sur le best-seller" },
  { id: "low_stock", label: "Stock faible", icon: "📦", hint: "Alerte stock faible" },
  { id: "losing_campaign", label: "Campagne déficitaire", icon: "💸", hint: "ROAS < 1 (perte d'argent)" },
  { id: "no_sales", label: "Trafic sans vente", icon: "🛒", hint: "Tunnel cassé" },
] as const;

export function TestPanel({ onApplied }: { onApplied?: () => void }) {
  const isAdmin = useIsAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const apply = async (scenario: string) => {
    if (busy) return;
    setBusy(scenario);
    try {
      const res = await fetch("/api/demo/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast(d.message ?? "Scénario appliqué ✓");
        // Refresh the badge + desktop notifier immediately (don't wait for poll).
        window.dispatchEvent(new Event("nightflow:notifs"));
        onApplied?.();
      } else {
        toast(d.error ?? "Application impossible", "info");
      }
    } catch {
      toast("Application impossible", "info");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-neon-violet/40 bg-neon-violet/5 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left text-[12px] font-bold text-neon-violet"
      >
        <FlaskConical className="h-4 w-4" />
        Mode test (admin) — déclencher une détection
        <ChevronDown
          className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <p className="mt-2 px-0.5 text-[11px] text-ink-mut">
            Injecte des données réelles conçues pour déclencher une alerte
            précise, puis va voir Notifications / AI Copilot. Visible par toi seul.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => apply(s.id)}
                disabled={busy !== null}
                title={s.hint}
                className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3 py-2 text-[12px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white disabled:opacity-50"
              >
                <span>{s.icon}</span>
                {busy === s.id ? "Application…" : s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
