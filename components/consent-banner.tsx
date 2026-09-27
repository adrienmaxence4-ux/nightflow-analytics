"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
          <p className="mt-1 text-[15px] leading-relaxed text-ink2 sm:text-[16px]">
            Pour voir comment ce site est utilisé et l&apos;améliorer. Rien d&apos;obligatoire :
            il fonctionne pareil si tu refuses. Les cookies de connexion, eux, restent actifs.{" "}
            <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
              En savoir plus
            </Link>
          </p>
        </div>

        {/* Deux boutons de même gabarit, côte à côte même sur téléphone : le
            bandeau ne doit pas manger la moitié de l'écran. Refuser d'abord
            dans l'ordre du DOM : c'est le premier atteint au clavier. */}
        <div className="grid flex-none grid-cols-2 gap-2.5 sm:flex">
          <button
            type="button"
            onClick={() => writeConsent("refused")}
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => writeConsent("accepted")}
            className={buttonVariants({ size: "md" })}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
