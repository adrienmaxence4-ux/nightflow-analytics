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
        // Night sky backgrounds
        night: {
          950: "#070B1A",
          900: "#0B1026",
          850: "#0E1430",
          800: "#111827",
        },
        // Neon accents
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
          DEFAULT: "#eaf0ff",
          dim: "#a7b0d8",
          mut: "#6b73a3",
        },
        glass: {
          DEFAULT: "rgba(20,24,52,0.55)",
          2: "rgba(28,32,68,0.45)",
          border: "rgba(140,160,255,0.14)",
          hi: "rgba(160,200,255,0.35)",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(61,242,255,0.35)",
        "glow-pink": "0 0 24px rgba(255,92,174,0.35)",
        premium: "0 18px 50px -18px rgba(0,0,0,0.75)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
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
