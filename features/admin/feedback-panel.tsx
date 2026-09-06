"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Les avis laissés sur le site public, lus et modérés depuis /admin.
 *
 * Composant à part plutôt qu'une section de plus dans admin/page.tsx, qui
 * dépasse déjà 600 lignes : il charge ses propres données et gère ses propres
 * états, sans alourdir la page.
 *
 * Les quatre états sont couverts : chargement, erreur, aucun avis, et la
 * liste. Un panneau vide sans explication laisserait croire à une panne.
 */

type Statut = "new" | "published" | "hidden";

interface Avis {
  id: string;
  rating: number;
  comment: string | null;
  name: string | null;
  page: string | null;
  status: Statut;
  created_at: string;
}

interface Donnees {
  avis: Avis[];
  counts: Record<Statut, number>;
  moyenne: number | null;
}

const ETIQUETTE: Record<Statut, string> = {
  new: "À relire",
  published: "Publié",
  hidden: "Masqué",
};

const TON: Record<Statut, string> = {
  new: "border-cool text-accent-text",
  published: "border-good/40 bg-good-bg text-good",
  hidden: "border-line text-ink3",
};

function quand(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j === 1 ? "hier" : `il y a ${j} j`;
}

function Etoiles({ note }: { note: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= note ? "text-accent" : "text-ink3"}`}
          fill={n <= note ? "currentColor" : "none"}
          strokeWidth={2.5}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function FeedbackPanel() {
  const [data, setData] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErreur(d.error ?? "Lecture impossible.");
        return;
      }
      setData((await res.json()) as Donnees);
      setErreur(null);
    } catch {
      setErreur("Pas de réseau.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const classer = async (id: string, status: Statut) => {
    setOccupe(id);
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await charger();
    setOccupe(null);
  };

  const supprimer = async (id: string) => {
    setOccupe(id);
    await fetch("/api/admin/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await charger();
    setOccupe(null);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-bold">⭐ Avis des visiteurs</h3>
        {data?.moyenne !== null && data?.moyenne !== undefined && (
          <span className="text-[13px] font-bold text-accent-text" data-numeric>
            {data.moyenne.toLocaleString("fr-FR", { minimumFractionDigits: 1 })} / 5
          </span>
        )}
        {data && (
          <span className="text-xs text-ink3">
            {data.counts.new} à relire · {data.counts.published} publiés ·{" "}
            {data.counts.hidden} masqués
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink3">
        Laissés depuis l&apos;encart de la landing. « Publié » marque ceux que tu
        pourras afficher comme preuve sociale.
      </p>

      {erreur ? (
        <p className="mt-3 text-[12px] text-bad">{erreur}</p>
      ) : !data ? (
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : data.avis.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink3">
          Aucun avis pour l&apos;instant — ils arriveront ici dès qu&apos;un
          visiteur en laissera un depuis la page d&apos;accueil ⭐
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {data.avis.map((a) => (
            <div key={a.id} className="rounded-[12px] border border-line bg-panel2 p-3.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Etoiles note={a.rating} />
                <span className="text-[13px] font-bold text-ink">
                  {a.name ?? "Anonyme"}
                </span>
                <span className="text-[12px] text-ink3">{quand(a.created_at)}</span>
                {a.page && a.page !== "/" && (
                  <span className="text-[12px] text-ink3">· {a.page}</span>
                )}
                <span
                  className={`ml-auto rounded-pill border px-2 py-0.5 text-[11px] font-bold ${TON[a.status]}`}
                >
                  {ETIQUETTE[a.status]}
                </span>
              </div>

              {a.comment && (
                <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink2">
                  {a.comment}
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap gap-2">
                {a.status !== "published" && (
                  <button
                    type="button"
                    disabled={occupe === a.id}
                    onClick={() => classer(a.id, "published")}
                    className="rounded-[8px] border border-good/40 px-2.5 py-1 text-[12px] font-bold text-good transition hover:bg-good-bg disabled:opacity-45"
                  >
                    Publier
                  </button>
                )}
                {a.status !== "hidden" && (
                  <button
                    type="button"
                    disabled={occupe === a.id}
                    onClick={() => classer(a.id, "hidden")}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[12px] font-bold text-ink3 transition hover:text-ink disabled:opacity-45"
                  >
                    Masquer
                  </button>
                )}
                {a.status !== "new" && (
                  <button
                    type="button"
                    disabled={occupe === a.id}
                    onClick={() => classer(a.id, "new")}
                    className="rounded-[8px] border border-line px-2.5 py-1 text-[12px] font-bold text-ink3 transition hover:text-ink disabled:opacity-45"
                  >
                    À relire
                  </button>
                )}
                <button
                  type="button"
                  disabled={occupe === a.id}
                  onClick={() => supprimer(a.id)}
                  aria-label="Supprimer cet avis"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] border border-bad/40 px-2.5 py-1 text-[12px] font-bold text-bad transition hover:bg-bad-bg disabled:opacity-45"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
