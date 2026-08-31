import type { Config } from "tailwindcss";

/**
 * Couleurs sémantiques uniquement — chacune pointe vers une CSS custom
 * property posée dans `app/globals.css`. La bascule clair/sombre se fait donc
 * sans variante `dark:` : c'est l'attribut `data-theme` qui redéfinit la
 * variable. Ne jamais rajouter ici une couleur en dur.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        line: "var(--line)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        ink3: "var(--ink3)",
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
          text: "var(--accent-text)",
        },
        cool: { DEFAULT: "var(--cool)", bg: "var(--cool-bg)" },
        good: { DEFAULT: "var(--good)", bg: "var(--good-bg)" },
        bad: { DEFAULT: "var(--bad)", bg: "var(--bad-bg)" },
        warn: { DEFAULT: "var(--warn)", bg: "var(--warn-bg)" },
      },
      // Échelle typographique — base 18px, plancher 15px.
      fontSize: {
        display: ["30px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        stat: ["52px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "800" }],
        title: ["24px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "800" }],
        head: ["19px", { lineHeight: "1.4", fontWeight: "700" }],
        body: ["18px", { lineHeight: "1.6" }],
        small: ["17px", { lineHeight: "1.6" }],
        label: ["15px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "var(--r-md)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-xl)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        DEFAULT: "var(--dur-base)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease-out)",
        out: "var(--ease-out)",
        in: "var(--ease-in)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      // Cible tactile minimale (48px) : min-h-tap / min-w-tap.
      spacing: {
        tap: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
