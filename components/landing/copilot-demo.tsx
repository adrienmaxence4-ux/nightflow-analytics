"use client";

import { useState } from "react";
import { ArrowRight, Sparkles, TriangleAlert } from "lucide-react";

/**
 * Démo jouable du Copilot, posée dans le hero de la landing.
 *
 * Pourquoi ici : le produit EST un moteur de réponses. La seule démonstration
 * honnête est donc de laisser le visiteur poser une question et lire la réponse.
 * Ça remplace la capture d'écran qu'on n'a pas, et ça donne enfin une vraie
 * destination au visiteur qui veut regarder avant de créer un compte.
 *
 * Les chiffres sont ceux de la boutique fictive MoonStore — annoncé en clair
 * dans l'en-tête du panneau, et identiques à ceux du brief du hero
 * (components/landing/brief-sample.ts). On ne fait pas passer une démo pour
 * du réel, et la page ne se contredit pas.
 *
 * Aucune latence simulée : la réponse est immédiate, seule son apparition est
 * échelonnée. L'animation est de la présentation, pas un faux calcul.
 */

type Tone = "good" | "bad" | "flat";

interface Demo {
  id: string;
  q: string;
  kpis: { label: string; value: string; delta: string; tone: Tone }[];
  verdict: string;
  evidence: string[];
  action: string;
}

/** Same pill as features/dashboard/kpi-card.tsx: one trend language, landing and app. */
const TONE_CLASS: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  bad: "bg-bad-bg text-bad",
  flat: "bg-panel2 text-ink2",
};
const TONE_ARROW: Record<Tone, string> = { good: "↑", bad: "↓", flat: "→" };

const DEMOS: Demo[] = [
  {
    id: "attention",
    q: "Qu'est-ce qui mérite mon attention ?",
    kpis: [
      { label: "À traiter", value: "3", delta: "1 urgent", tone: "bad" },
      { label: "Revenu (7j)", value: "€4 820", delta: "−26 %", tone: "bad" },
      { label: "Lecture", value: "~30 s", delta: "aujourd'hui", tone: "flat" },
    ],
    verdict: "Trois choses, dans cet ordre : une pub Meta qui perd, la conversion qui décroche, le stock de la Lampe Halo.",
    evidence: [
      "Meta · Retargeting — Large : €412 dépensés pour €330 générés (ROAS 0,80).",
      "Conversion : 1,9 % sur 7 jours contre 2,8 % la semaine précédente (−32 %).",
      "Lampe Halo : 12 unités restantes pour un produit qui se vend chaque jour.",
    ],
    action:
      "Commence par la pub : c'est la seule des trois qui te coûte de l'argent chaque jour.",
  },
  {
    id: "ca",
    q: "Pourquoi mes ventes baissent ?",
    kpis: [
      { label: "Revenu (7j)", value: "€4 820", delta: "−26 %", tone: "bad" },
      { label: "Sessions", value: "3 412", delta: "+2 %", tone: "good" },
      { label: "Conversion", value: "1,9 %", delta: "−32 %", tone: "bad" },
    ],
    verdict: "Le trafic tient. C'est la conversion qui a décroché.",
    evidence: [
      "Sessions stables : 3 412, soit +2 % vs la semaine précédente.",
      "Conversion : 1,9 % contre 2,8 % la semaine précédente.",
      "Panier moyen €34, stable. Aucune rupture sur tes dix meilleures ventes.",
      "Le problème est dans le tunnel, pas dans le trafic. À quelle étape, Nightflow ne le voit pas — il te le dit plutôt que de l'inventer.",
    ],
    action:
      "Passe une commande test de bout en bout, sur mobile d'abord. ≈ €1 040 par semaine en jeu à trafic constant.",
  },
  {
    id: "ads",
    q: "Où est-ce que je perds de l'argent ?",
    kpis: [
      { label: "Dépense pub (7j)", value: "€1 180", delta: "+4 %", tone: "flat" },
      { label: "CA publicitaire", value: "€2 832", delta: "−11 %", tone: "bad" },
      { label: "ROAS moyen", value: "2,4", delta: "−0,6", tone: "bad" },
    ],
    verdict: "Meta « Retargeting — Large » perd de l'argent.",
    evidence: [
      "Meta · Retargeting — Large : €412 dépensés pour €330 générés → ROAS 0,80.",
      "Google · Marque : €180 dépensés pour €1 386 générés → ROAS 7,7.",
      "Meta · Lookalike 1 % : ROAS 3,1 — à garder tel quel.",
    ],
    action:
      "Mets « Retargeting — Large » en pause : ≈ €350 par mois de budget récupéré, à réinvestir sur Google · Marque.",
  },
  {
    id: "works",
    q: "Qu'est-ce qui fonctionne ?",
    kpis: [
      { label: "Google · Marque", value: "ROAS 7,7", delta: "+18 %", tone: "good" },
      { label: "Meta · Lookalike", value: "ROAS 3,1", delta: "stable", tone: "good" },
      { label: "Panier moyen", value: "€34", delta: "+3 %", tone: "good" },
    ],
    verdict: "Google · Marque porte la semaine, et le panier moyen monte.",
    evidence: [
      "Google · Marque : €180 dépensés pour €1 386 générés cette semaine.",
      "Coussin Nuit : 48 ventes, meilleure vente de la semaine.",
      "Panier moyen €34, +3 % vs la semaine précédente.",
    ],
    action:
      "Garde le budget Google intact. La baisse du CA vient de la conversion, pas de la pub.",
  },
  {
    id: "day",
    q: "Résume ma journée.",
    kpis: [
      { label: "Revenu aujourd'hui", value: "€612", delta: "+4 % vs hier", tone: "good" },
      { label: "Commandes", value: "18", delta: "+1", tone: "flat" },
      { label: "Conversion", value: "1,9 %", delta: "−0,4 pt", tone: "bad" },
    ],
    verdict: "Journée normale en volume, conversion toujours basse.",
    evidence: [
      "18 commandes pour €612 : dans la moyenne des 30 derniers jours.",
      "Conversion à 1,9 % pour le sixième jour de suite.",
      "Aucune rupture, aucune campagne arrêtée. Meta · Retargeting — Large toujours à ROAS 0,80.",
    ],
    action:
      "Rien à faire ce soir, sauf la commande test et la pause de Meta · Retargeting — cinq minutes.",
  },
];

export function CopilotDemo() {
  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const active = DEMOS.find((d) => d.id === activeId) ?? DEMOS[0];

  return (
    <div className="rounded-xl border border-line bg-panel p-5 sm:p-6">
      {/* En-tête : on annonce que c'est une démo, sans ambiguïté. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1 text-label font-extrabold tracking-[0.04em] text-accent-ink">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> DÉMO JOUABLE
        </span>
        <span className="text-label font-normal text-ink3">
          Boutique fictive MoonStore — clique une question
        </span>
      </div>

      {/* KPIs — ils suivent la question posée. */}
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
        {active.kpis.map((k) => (
          <div
            key={`${active.id}-${k.label}`}
            className="nf-reveal rounded-[12px] border border-line bg-panel2 p-3.5"
          >
            <div className="whitespace-nowrap text-label text-ink3">{k.label}</div>
            <div
              className="mt-1 whitespace-nowrap font-display text-[24px] font-extrabold"
              data-numeric
            >
              {k.value}
            </div>
            <span
              className={`mt-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-label ${TONE_CLASS[k.tone]}`}
            >
              <span aria-hidden>{TONE_ARROW[k.tone]}</span>
              {k.delta}
            </span>
          </div>
        ))}
      </div>

      {/* Les questions — dans les mots du marchand, pas dans ceux du produit. */}
      <div
        role="group"
        aria-label="Questions à poser à Nightflow"
        className="mb-4 flex flex-wrap gap-2"
      >
        {DEMOS.map((d) => {
          const on = d.id === active.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveId(d.id)}
              aria-pressed={on}
              className={[
                "min-h-tap rounded-[12px] border px-4 text-left text-[15px] font-semibold transition duration-fast",
                on
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-panel2 text-ink2 hover:border-accent hover:text-ink active:brightness-95",
              ].join(" ")}
            >
              {d.q}
            </button>
          );
        })}
      </div>

      {/* La réponse. `key` sur l'enfant force le remontage → l'apparition se
          rejoue ; aria-live sur le parent stable pour que le changement soit
          annoncé (une région qui naît avec son contenu ne l'est pas). */}
      <div aria-live="polite" aria-atomic="true">
      <div
        key={active.id}
        className="rounded-lg border border-line bg-warn-bg p-5"
      >
        <div className="nf-reveal flex items-center gap-2 text-label font-extrabold tracking-[0.06em] text-accent-text">
          <TriangleAlert className="h-4 w-4 flex-none" aria-hidden /> RÉPONSE DE NIGHTFLOW
        </div>

        <p
          className="nf-reveal mt-3 text-[19px] font-bold leading-snug"
          style={{ animationDelay: "70ms" }}
        >
          {active.verdict}
        </p>

        <ul className="mt-3 flex flex-col gap-1.5">
          {active.evidence.map((e, i) => (
            <li
              key={e}
              className="nf-reveal flex gap-2.5 text-[16px] leading-relaxed text-ink2"
              style={{ animationDelay: `${140 + i * 70}ms` }}
            >
              <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-pill bg-accent" aria-hidden />
              {e}
            </li>
          ))}
        </ul>

        <p
          className="nf-reveal mt-4 flex gap-2.5 border-t border-line pt-4 text-[17px] font-semibold leading-relaxed text-ink"
          style={{ animationDelay: `${140 + active.evidence.length * 70 + 70}ms` }}
        >
          <ArrowRight className="mt-1 h-5 w-5 flex-none text-accent-text" aria-hidden />
          {active.action}
        </p>
      </div>
      </div>
    </div>
  );
}
