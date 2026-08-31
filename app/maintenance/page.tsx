import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance — Nightflow Analytics",
  robots: { index: false, follow: false },
};

/**
 * Shown (via middleware rewrite) to everyone EXCEPT the admin while maintenance
 * mode is on. Public, standalone, no auth or data required.
 */
export default function MaintenancePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-8 h-20 w-20">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#g)"
              strokeWidth="7"
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#3df2ff" />
                <stop offset="0.55" stopColor="#9a6bff" />
                <stop offset="1" stopColor="#ff5cae" />
              </linearGradient>
              <mask id="m">
                <rect width="100" height="100" fill="black" />
                <circle cx="47" cy="52" r="24" fill="white" />
                <circle cx="57" cy="44" r="21" fill="black" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="#fff" mask="url(#m)" />
          </svg>
        </div>

        <p className="text-xs font-extrabold tracking-[0.3em] text-accent-text">
          NIGHTFLOW ANALYTICS
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
          Maintenance en cours
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink2">
          On peaufine quelques réglages pour améliorer ton expérience. Le site
          revient très vite — merci de ta patience. 🌙
        </p>
      </div>
    </main>
  );
}
