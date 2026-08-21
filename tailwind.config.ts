import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fonds ciel de nuit
        night: {
          950: "#070B1A",
          900: "#0B1026",
          850: "#0E1430",
          800: "#111827",
        },
        // Accents néon
        neon: {
          cyan: "#3df2ff",
          cyansoft: "#7af4ff",
          pink: "#ff5cae",
          pinksoft: "#ff8fcb",
          violet: "#9a6bff",
          lime: "#7dffb0",
          amber: "#ffcc66",
        },
        ink: {
          DEFAULT: "#eaf0ff", // 17.6:1 sur night-950
          dim: "#a7b0d8", //  9.0:1
          // Était #6b73a3 → 4.22:1, sous le minimum WCAG AA de 4.5:1.
          // #7b84b0 mesure 5.3:1 en restant nettement en retrait.
          mut: "#7b84b0",
        },
        glass: {
          DEFAULT: "rgba(20,24,52,0.55)",
          2: "rgba(28,32,68,0.45)",
          border: "rgba(140,160,255,0.14)",
          hi: "rgba(160,200,255,0.35)",
        },
      },
      // Échelle typographique — 5 tailles pour toute l'app.
      // Au-delà, la hiérarchie cesse d'être lisible.
      fontSize: {
        display: ["36px", { lineHeight: "1", letterSpacing: "-0.025em", fontWeight: "800" }],
        title: ["22px", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "800" }],
        head: ["16px", { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "700" }],
        body: ["14px", { lineHeight: "1.55" }],
        label: ["12px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-lg)",
        "2xl": "var(--r-xl)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(61,242,255,0.35)",
        "glow-pink": "0 0 24px rgba(255,92,174,0.35)",
        premium: "0 18px 50px -18px rgba(0,0,0,0.75)",
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
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      // Cible tactile minimale (44px) utilisable comme min-h-tap / min-w-tap.
      spacing: {
        tap: "44px",
      },
      keyframes: {
        spinslow: { to: { transform: "rotate(360deg)" } },
        pulsedot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        drift: {
          "0%": { filter: "hue-rotate(0deg) saturate(1)" },
          "100%": { filter: "hue-rotate(18deg) saturate(1.15)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        spinslow: "spinslow 6s linear infinite",
        pulsedot: "pulsedot 1.6s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite alternate",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
