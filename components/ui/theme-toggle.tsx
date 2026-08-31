"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Interrupteur clair / sombre.
 * - `variant="button"` : topbar — carré icône seule sous 480 px, icône + libellé au-delà.
 * - `variant="inline"` : carte Affichage des Réglages — pleine largeur, toujours libellé.
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
        "inline-flex items-center justify-center gap-2 rounded-[12px] border border-line bg-panel2 font-semibold text-ink2 transition duration-base ease-out hover:text-ink",
        variant === "button"
          ? "h-tap w-tap min-[480px]:w-auto min-[480px]:px-4 min-[480px]:text-label"
          : "h-tap w-full px-4 text-body",
        className
      )}
    >
      <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
      <span className={variant === "button" ? "hidden min-[480px]:inline" : undefined}>
        {label}
      </span>
    </button>
  );
}
