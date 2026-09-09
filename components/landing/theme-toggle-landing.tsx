"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Interrupteur clair / sombre propre à la landing et à la connexion.
 * Ces pages sont indépendantes du thème global de l'app : elles portent leur
 * propre `data-theme` sur un conteneur `#<rootId>`, persisté sous une clé
 * séparée pour ne pas écraser la préférence de l'application.
 */
type Theme = "clair" | "sombre";

export function LandingThemeToggle({
  rootId = "landing-root",
  storageKey = "nightflow:landing-theme",
}: {
  rootId?: string;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>("sombre");

  useEffect(() => {
    const cur = document.getElementById(rootId)?.getAttribute("data-theme");
    if (cur === "clair" || cur === "sombre") setTheme(cur);
  }, [rootId]);

  const next: Theme = theme === "sombre" ? "clair" : "sombre";
  const Icon = next === "sombre" ? Moon : Sun;

  const flip = () => {
    setTheme(next);
    document.getElementById(rootId)?.setAttribute("data-theme", next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={next === "sombre" ? "Passer en mode sombre" : "Passer en mode clair"}
      className="inline-flex min-h-tap items-center gap-2 rounded-[12px] border border-cool px-4 text-[16px] font-semibold text-ink transition hover:border-accent"
    >
      <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
      {next === "sombre" ? "Sombre" : "Clair"}
    </button>
  );
}
