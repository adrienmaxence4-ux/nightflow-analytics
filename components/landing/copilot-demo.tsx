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
 * Les chiffres sont ceux de la boutique d'exemple MoonStore — annoncé en clair
 * dans l'en-tête du panneau. On ne fait pas passer une démo pour du réel.
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

const TONE_CLASS: Record<Tone, string> = {
  good: "text-good",
  bad: "text-bad",
  flat: "text-ink3",
};

const DEMOS: Demo[] = [
  {
    id: "ca",
    q: "Pourquoi mon CA a baissé cette semaine ?",
    kpis: [
      { label: "Revenu (7j)", value: "€4 820", delta: "−26 %", tone: "bad" },
      { label: "Sessions", value: "3 412", delta: "+2 %", tone: "good" },
      { label: "Conversion", value: "2,1 %", delta: "−31 %", tone: "bad" },
    ],
    verdict: "Le trafic tient. C'est la conversion mobile qui décroche.",
    evidence: [
      "Sessions stables : 3 412, soit +2 % vs la semaine précédente.",
      "Conversion desktop : 4,3 % — inchangée.",
      "Conversion mobile : 1,1 %, contre 2,8 % mardi dernier.",
      "La chute est concentrée sur le tunnel de paiement : −62 % de paniers menés au bout.",
    ],
    action:
      "Testez le paiement depuis un téléphone en priorité. Un tunnel cassé sur mobile coûte ici ≈ €1 240 par semaine.",
  },
  {
    id: "ads",
    q: "Quelle pub je dois couper ?",
    kpis: [
      { label: "Dépense (7j)", value: "€1 180", delta: "+4 %", tone: "flat" },
      { label: "CA publicitaire", value: "€2 832", delta: "−11 %", tone: "bad" },
      { label: "ROAS moyen", value: "2,4", delta: "−0,6", tone: "bad" },
    ],
    verdict: "Meta « Retargeting — Large » perd de l'argent depuis 9 jours.",
    evidence: [
      "Meta · Retargeting — Large : €412 dépensés pour €330 générés → ROAS 0,8.",
      "Google · Marque : €180 dépensés pour €1 386 générés → ROAS 7,7.",
      "Meta · Lookalike 1 % : ROAS 3,1 — à conserver tel quel.",
    ],
    action:
      "Coupez « Retargeting — Large » et basculez son budget sur Google/Marque : ≈ €560 par mois récupérés à volume constant.",
  },
  {
    id: "stock",
    q: "Qu'est-ce que je dois recommander ?",
    kpis: [
      { label: "Références actives", value: "84", delta: "stable", tone: "flat" },
      { label: "Rupture < 14 j", value: "3", delta: "+2", tone: "bad" },
      { label: "CA à risque", value: "€1 600", delta: "/semaine", tone: "bad" },
    ],
    verdict: "Trois références passent en rupture avant votre prochain réassort.",
    evidence: [
      "Lampe Halo : 25 unités en stock, 5,8 ventes/jour → rupture dans ~4 jours.",
      "Coussin Nuit : 40 unités, 3,1 ventes/jour → rupture dans ~13 jours.",
      "Plaid Éclipse : 12 unités, 0,9 vente/jour → rupture dans ~13 jours.",
    ],
    action:
      "Commandez la Lampe Halo en urgence, 60 unités minimum. C'est ≈ €1 600 par semaine de CA en jeu.",
  },
  {
    id: "retention",
    q: "Est-ce que mes clients reviennent ?",
    kpis: [
      { label: "Clients (7j)", value: "142", delta: "+8 %", tone: "good" },
      { label: "Dont réachat", value: "19 %", delta: "−8 pts", tone: "bad" },
      { label: "Panier moyen", value: "€34", delta: "+3 %", tone: "good" },
    ],
    verdict: "Votre réachat décroche au 2ᵉ mois, pas au 1ᵉʳ.",
    evidence: [
      "Réachat à 30 jours : 31 % — bon pour votre catégorie.",
      "Réachat à 60 jours : 19 %, en baisse de 8 points sur 3 mois.",
      "Aucun e-mail envoyé entre J+14 et J+45.",
    ],
    action:
      "Ajoutez une relance Klaviyo à J+21. Sur votre volume, +5 points de réachat valent ≈ €740 par mois.",
  },
];

export function CopilotDemo() {
  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const active = DEMOS.find((d) => d.id === activeId) ?? DEMOS[0];

  return (
    <div className="rounded-xl border border-line bg-panel p-6 sm:p-7">
      {/* En-tête : on annonce que c'est une démo, sans ambiguïté. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-1.5 text-[15px] font-extrabold tracking-[0.04em] text-accent-ink">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> DÉMO JOUABLE
        </span>
        <span className="text-[16px] text-ink3">
          Boutique d&apos;exemple MoonStore — cliquez une question
        </span>
      </div>

      {/* KPIs — ils suivent la question posée. */}
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {active.kpis.map((k) => (
          <div
            key={`${active.id}-${k.label}`}
            className="nf-reveal rounded-[12px] border border-line bg-panel2 p-4"
          >
            <div className="whitespace-nowrap text-[15px] font-semibold text-ink3">
              {k.label}
            </div>
            <div
              className="mt-1 whitespace-nowrap font-display text-[26px] font-extrabold"
              data-numeric
            >
              {k.value}
            </div>
            <div className={`whitespace-nowrap text-[15px] font-bold ${TONE_CLASS[k.tone]}`}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Les questions — dans les mots du marchand, pas dans ceux du produit. */}
      <div
        role="group"
        aria-label="Questions à poser au copilote"
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
                "min-h-tap rounded-[12px] border px-5 text-left text-[16px] font-semibold transition duration-fast",
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

      {/* La réponse. `key` force le remontage → l'apparition se rejoue.
          aria-live pour que le changement soit annoncé, pas seulement visible. */}
      <div
        key={active.id}
        aria-live="polite"
        aria-atomic="true"
        className="rounded-[14px] border border-warn/30 bg-warn-bg p-6"
      >
        <div className="nf-reveal flex items-center gap-2 text-[15px] font-extrabold tracking-[0.06em] text-accent-text">
          <TriangleAlert className="h-4 w-4 flex-none" aria-hidden /> RÉPONSE DU COPILOTE
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
              className="nf-reveal flex gap-2.5 text-[17px] leading-relaxed text-ink2"
              style={{ animationDelay: `${140 + i * 70}ms` }}
            >
              <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-pill bg-accent" aria-hidden />
              {e}
            </li>
          ))}
        </ul>

        <p
          className="nf-reveal mt-4 flex gap-2.5 border-t border-warn/30 pt-4 text-[17px] font-semibold leading-relaxed text-ink"
          style={{ animationDelay: `${140 + active.evidence.length * 70 + 70}ms` }}
        >
          <ArrowRight className="mt-1 h-5 w-5 flex-none text-accent-text" aria-hidden />
          {active.action}
        </p>
      </div>
    </div>
  );
}
