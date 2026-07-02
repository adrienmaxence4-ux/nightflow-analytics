"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  generateStoreReportFile,
  type ReportFormat,
} from "@/services/report.service";

/**
 * "Générer un rapport" split button: one click opens a small menu to pick the
 * file format (PDF / Excel / Word). All formats are built client-side from the
 * store's REAL data via the shared report collector.
 */
const FORMATS: { id: ReportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { id: "pdf", label: "PDF", hint: "Rapport de présentation (.pdf)", icon: FileText },
  { id: "xlsx", label: "Excel", hint: "Tableaux par onglet (.xlsx)", icon: FileSpreadsheet },
  { id: "docx", label: "Word", hint: "Document éditable (.docx)", icon: FileType },
];

export function ReportMenu() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const generate = async (format: ReportFormat) => {
    if (busy) return;
    setOpen(false);
    setBusy(format);
    toast("Génération du rapport…", "info");
    try {
      const { source } = await generateStoreReportFile(format);
      toast(
        source === "db"
          ? `Rapport ${format.toUpperCase()} téléchargé ✓`
          : `Rapport ${format.toUpperCase()} (démo) téléchargé ✓`
      );
    } catch {
      toast("Génération impossible", "info");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-3.5 py-2 text-xs font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
      >
        <FileText className="h-3.5 w-3.5" />
        {busy ? `Génération ${busy.toUpperCase()}…` : "Générer un rapport"}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-xl border border-glass-hi bg-night-900/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          {FORMATS.map((f) => (
            <button
              key={f.id}
              role="menuitem"
              onClick={() => generate(f.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-glass-2"
            >
              <f.icon className="h-4 w-4 flex-none text-neon-cyansoft" />
              <span>
                <span className="block text-[13px] font-bold">{f.label}</span>
                <span className="block text-[11px] text-ink-mut">{f.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
