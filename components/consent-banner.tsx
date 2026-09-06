"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readConsent, subscribeConsent, writeConsent } from "@/lib/consent";

/**
 * Bandeau de consentement aux traceurs de mesure.
 *
 * Il ne s'affiche que si aucun choix valide n'est enregistré, et il ne rend
 * rien côté serveur — le premier rendu client décide, ce qui évite un flash de
 * bandeau chez quelqu'un qui a déjà répondu.
 *
 * « Refuser » et « Accepter » sont deux boutons de même taille, au même
 * endroit, à un clic chacun : refuser ne doit jamais coûter plus cher
 * qu'accepter. Aucune case pré-cochée, et fermer la page ne vaut pas accord —
 * tant qu'on n'a pas cliqué, rien ne se charge.
 */
export function ConsentBanner() {
  // `null` tant qu'on n'a pas lu le stockage : on ne rend rien à ce stade.
  const [needsChoice, setNeedsChoice] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setNeedsChoice(readConsent() === null);
    sync();
    return subscribeConsent(sync);
  }, []);

  if (needsChoice !== true) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-0 bottom-0 z-[300] border-t border-line bg-panel p-4 shadow-card sm:p-5"
    >
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <p id="consent-title" className="text-[17px] font-bold">
            Mesure d&apos;audience
          </p>
          <p className="mt-1 text-[16px] leading-relaxed text-ink2">
            Nous aimerions mesurer comment ce site est utilisé, pour l&apos;améliorer. Ça
            n&apos;a rien d&apos;obligatoire et le site fonctionne pareil si vous refusez.
            Les cookies nécessaires à votre connexion, eux, restent actifs.{" "}
            <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
              En savoir plus
            </Link>
          </p>
        </div>

        {/* Deux boutons de même gabarit. Refuser d'abord dans l'ordre du DOM :
            c'est le premier atteint au clavier. */}
        <div className="flex flex-none flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => writeConsent("refused")}
            className="min-h-tap rounded-[12px] border border-cool px-6 text-[16px] font-bold text-ink transition hover:border-accent active:brightness-95"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => writeConsent("accepted")}
            className="min-h-tap rounded-[12px] bg-accent px-6 text-[16px] font-bold text-accent-ink transition hover:brightness-95 active:brightness-90"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
