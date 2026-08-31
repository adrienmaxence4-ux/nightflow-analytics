"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Interrupteur clair / sombre. `variant="button"` (défaut) pour la topbar,
 * `variant="inline"` pour la carte Affichage des Réglages.
 */
export function ThemeToggle({
  variant = "button",
  className,
}: {
  variant?: "button" | "inline";
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const goingDark = theme === "clair";
  const Icon = goingDark ? Moon : Sun;
  const label = goingDark ? "Mode sombre" : "Mode clair";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-line bg-panel2 font-semibold text-ink2 transition duration-base ease-out hover:text-ink",
        variant === "button"
          ? "h-tap px-4 text-label"
          : "h-tap w-full justify-center px-4 text-body",
        className
      )}
    >
      <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
