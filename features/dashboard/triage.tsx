"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TriageItem, TriageZones } from "@/types";

/**
 * « Ton point du jour » — l'activité triée en trois zones : ce qui rapporte,
 * ce qui coûte de l'argent, ce qu'il faut surveiller. Chaque ligne porte son
 * action, sinon c'est un tableau de bord de plus.
 *
 * Rendu : nébuleuse en fond, voile sombre par-dessus, cartes en verre qui
 * portent leur propre fond opaque. Le texte ne repose jamais directement sur
 * une zone claire — c'est ce qui rend l'effet spatial lisible.
 */
const ZONES = [
  {
    key: "winning" as const,
    label: "CE QUI MARCHE",
    tint: "#7dffb0",
    empty: "Rien à célébrer pour l'instant.",
  },
  {
    key: "fix" as const,
    label: "À RÉGLER",
    tint: "#ff5c72",
    empty: "Aucun problème détecté 🎉",
  },
  {
    key: "watch" as const,
    label: "À SURVEILLER",
    tint: "#ffcc66",
    empty: "Rien à surveiller.",
  },
];

function Row({ item, tint }: { item: TriageItem; tint: string }) {
  return (
    <li
      className="rounded-xl border p-3 transition-colors"
      style={{
        // Fond propre à la carte : garantit le contraste du texte quelle que
        // soit la zone de la nébuleuse qui se trouve derrière.
        background: "rgba(8,11,26,0.62)",
        borderColor: `${tint}2e`,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-[15px] leading-none">{item.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug text-white">
            {item.title}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
            {item.detail}
          </p>
          <p
            className="mt-1.5 text-[12.5px] font-semibold leading-snug"
            style={{ color: tint }}
          >
            → {item.action}
          </p>
          {item.impact && (
            <span
              className="mt-2 inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
              style={{ background: `${tint}1f`, color: tint }}
            >
              {item.impact}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function Triage() {
  const [data, setData] = useState<TriageZones | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/triage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const updatedAt = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="relative">
      {/* Halos très doux seulement : le ciel étoilé de la page reste visible
          au travers, sinon le bloc se détache comme une vignette collée. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-10 bottom-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(620px 260px at 18% 0%, rgba(154,107,255,0.20), transparent 70%)," +
            "radial-gradient(560px 240px at 82% 10%, rgba(61,242,255,0.13), transparent 70%)",
        }}
      />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[19px] font-extrabold tracking-tight text-white">
              Ton point du jour
            </h2>
            <p className="mt-0.5 text-[12.5px] text-ink-dim">
              Ce qui va, ce qui ne va pas — et quoi faire.
            </p>
          </div>
          <span className="text-[11.5px] font-semibold text-ink-mut">
            mis à jour à {updatedAt}
          </span>
        </div>

        {failed ? (
          <p className="rounded-xl border border-glass-border bg-[rgba(8,11,26,0.6)] p-4 text-[13px] text-ink-dim">
            Impossible de charger ton point du jour. Réessaie dans un instant.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ZONES.map((zone) => {
              const items = data?.[zone.key];
              return (
                <div
                  key={zone.key}
                  // Même verre que les autres cartes de l'app (bg-glass +
                  // backdrop-blur), teinté par la couleur de la zone.
                  className="rounded-2xl border bg-glass p-4 backdrop-blur-xl"
                  style={{
                    borderColor: `${zone.tint}33`,
                    boxShadow: `inset 0 1px 0 ${zone.tint}1f`,
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: zone.tint, boxShadow: `0 0 10px ${zone.tint}` }}
                    />
                    <h3
                      className="text-[11.5px] font-extrabold tracking-[1.6px]"
                      style={{ color: zone.tint }}
                    >
                      {zone.label}
                    </h3>
                    {items && (
                      <span className="ml-auto text-[11.5px] font-bold text-ink-mut">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {!data ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-[74px] rounded-xl" />
                      <Skeleton className="h-[74px] rounded-xl" />
                    </div>
                  ) : items && items.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {items.map((it) => (
                        <Row key={it.id} item={it} tint={zone.tint} />
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-glass-border px-3 py-4 text-center text-[12px] text-ink-mut">
                      {zone.empty}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && !data.connected && (
          <p className="mt-4 text-[12px] text-ink-mut">
            Connecte ta boutique pour remplir ce tableau avec tes vraies données.
          </p>
        )}
      </div>
    </section>
  );
}
