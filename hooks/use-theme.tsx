"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Thème clair / sombre. L'attribut `data-theme` est posé sur <html> par le
 * script anti-flash de `app/layout.tsx` avant l'hydratation ; ce provider se
 * contente de le synchroniser avec l'état React et `localStorage` quand
 * l'utilisateur change de thème.
 *
 * La landing et la connexion forcent le sombre localement via un conteneur
 * `data-theme="sombre"` — elles ne passent pas par ce provider.
 */
export type Theme = "clair" | "sombre";

const STORAGE_KEY = "nightflow:theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "clair",
  setTheme: () => {},
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* stockage indisponible (navigation privée) — le thème reste en mémoire */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("clair");

  // Lit la valeur réellement posée par le script anti-flash, après montage.
  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "sombre" || attr === "clair") setThemeState(attr);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    apply(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "sombre" ? "clair" : "sombre";
      apply(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
