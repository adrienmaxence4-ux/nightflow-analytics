"use client";

import { useEffect } from "react";

/** Global error boundary — styled fallback instead of a white crash screen. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="mb-2 text-[10px] font-bold tracking-[3px] text-neon-pinksoft">
          ✦ TURBULENCE DÉTECTÉE
        </div>
        <h1 className="text-[40px] font-extrabold leading-tight tracking-tight">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="mt-2 text-ink-dim">
          L&apos;erreur a été enregistrée. Vos données ne sont pas affectées.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-sm font-bold text-night-950 shadow-glow transition hover:brightness-110"
          >
            Réessayer
          </button>
          <a
            href="/dashboard"
            className="rounded-xl border border-glass-border bg-glass px-5 py-2.5 text-sm font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
          >
            Retour au dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
