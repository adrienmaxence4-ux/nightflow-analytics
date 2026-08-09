"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * « Ton point du jour » — l'activité triée en trois zones : ce qui rapporte,
 * ce qui coûte de l'argent, ce qu'il faut surveiller. Chaque ligne porte son
 * action, sinon c'est un tableau de bord de plus.
 *
 * Rendu : nébuleuse en fond, voile sombre par-dessus, cartes en verre qui
 * portent leur propre fond opaque. Le texte ne repose jamais directement sur
 * une zone claire — c'est ce qui rend l'effet spatial lisible.
 */
interface Item {
  id: string;
  icon: string;
  titre: string;
  detail: string;
  action: string;
  impact: string;
}
interface Triage {
  gagne: Item[];
  regler: Item[];
  surveiller: Item[];
  connecte: boolean;
}

const ZONES = [
  {
    cle: "gagne" as const,
    label: "CE QUI MARCHE",
    teinte: "#7dffb0",
    vide: "Rien à célébrer pour l'instant.",
  },
  {
    cle: "regler" as const,
    label: "À RÉGLER",
    teinte: "#ff5c72",
    vide: "Aucun problème détecté 🎉",
  },
  {
    cle: "surveiller" as const,
    label: "À SURVEILLER",
    teinte: "#ffcc66",
    vide: "Rien à surveiller.",
  },
];

function Ligne({ item, teinte }: { item: Item; teinte: string }) {
  return (
    <li
      className="rounded-xl border p-3 transition-colors"
      style={{
        // Fond propre à la carte : garantit le contraste du texte quelle que
        // soit la zone de la nébuleuse qui se trouve derrière.
        background: "rgba(8,11,26,0.62)",
        borderColor: `${teinte}2e`,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-[15px] leading-none">{item.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug text-white">
            {item.titre}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
            {item.detail}
          </p>
          <p
            className="mt-1.5 text-[12.5px] font-semibold leading-snug"
            style={{ color: teinte }}
          >
            → {item.action}
          </p>
          {item.impact && (
            <span
              className="mt-2 inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
              style={{ background: `${teinte}1f`, color: teinte }}
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
  const [data, setData] = useState<Triage | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    fetch("/api/triage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setErreur(true));
  }, []);

  const heure = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="relative overflow-hidden rounded-3xl border border-glass-border">
      {/* ── Nébuleuse ── trois halos colorés qui donnent la profondeur */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 420px at 12% -10%, rgba(154,107,255,0.55), transparent 62%)," +
            "radial-gradient(760px 380px at 88% 8%, rgba(61,242,255,0.30), transparent 60%)," +
            "radial-gradient(680px 460px at 62% 115%, rgba(255,92,174,0.24), transparent 62%)," +
            "linear-gradient(160deg, #0a0f2b 0%, #070b1a 60%, #05070f 100%)",
        }}
      />
      {/* Poussière d'étoiles — points fins, jamais sous une carte */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(1.1px 1.1px at 18% 22%, #fff, transparent)," +
            "radial-gradient(1px 1px at 34% 68%, #cfe3ff, transparent)," +
            "radial-gradient(1.3px 1.3px at 57% 14%, #fff, transparent)," +
            "radial-gradient(1px 1px at 73% 52%, #bcd8ff, transparent)," +
            "radial-gradient(1.2px 1.2px at 89% 31%, #fff, transparent)," +
            "radial-gradient(1px 1px at 46% 88%, #dbe9ff, transparent)," +
            "radial-gradient(1px 1px at 8% 74%, #fff, transparent)",
        }}
      />
      {/* Voile : sans lui, le texte passerait sur des zones claires */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,7,15,0.28) 0%, rgba(5,7,15,0.55) 100%)",
        }}
      />

      <div className="relative p-5 sm:p-6">
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
            mis à jour à {heure}
          </span>
        </div>

        {erreur ? (
          <p className="rounded-xl border border-glass-border bg-[rgba(8,11,26,0.6)] p-4 text-[13px] text-ink-dim">
            Impossible de charger ton point du jour. Réessaie dans un instant.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ZONES.map((zone) => {
              const items = data?.[zone.cle];
              return (
                <div
                  key={zone.cle}
                  className="rounded-2xl border p-4 backdrop-blur-xl"
                  style={{
                    background: "rgba(14,18,40,0.55)",
                    borderColor: `${zone.teinte}33`,
                    boxShadow: `inset 0 1px 0 ${zone.teinte}1f`,
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: zone.teinte, boxShadow: `0 0 10px ${zone.teinte}` }}
                    />
                    <h3
                      className="text-[11.5px] font-extrabold tracking-[1.6px]"
                      style={{ color: zone.teinte }}
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
                        <Ligne key={it.id} item={it} teinte={zone.teinte} />
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-glass-border px-3 py-4 text-center text-[12px] text-ink-mut">
                      {zone.vide}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && !data.connecte && (
          <p className="mt-4 text-[12px] text-ink-mut">
            Connecte ta boutique pour remplir ce tableau avec tes vraies données.
          </p>
        )}
      </div>
    </section>
  );
}
