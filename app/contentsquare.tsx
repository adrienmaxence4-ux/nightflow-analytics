"use client";

import { useEffect, useRef } from "react";
import { injectContentsquareScript } from "@contentsquare/tag-sdk";
import { readConsent, subscribeConsent } from "@/lib/consent";

/**
 * Contentsquare — mesure d'audience et enregistrement de session.
 *
 * Chargé UNIQUEMENT après un « Accepter » explicite. L'enregistrement de
 * session ne relève pas de l'exemption « mesure d'audience » de la CNIL : sans
 * consentement préalable, le tag ne doit pas être injecté du tout. D'où le
 * verrou ici plutôt qu'un simple opt-out côté Contentsquare.
 *
 * Le tag ne se retire pas d'une page une fois injecté : si l'utilisateur
 * revient sur son accord, le verrou empêche toute nouvelle injection et le
 * rechargement suivant part propre. C'est pour ça qu'on n'injecte qu'une fois
 * (`injected`) — un remontage ne doit pas rejouer l'injection.
 */
export function Contentsquare() {
  const injected = useRef(false);

  useEffect(() => {
    const run = () => {
      if (injected.current) return;
      if (readConsent() !== "accepted") return;
      injected.current = true;
      injectContentsquareScript({ clientId: "54945bd048170" });
    };
    run();
    return subscribeConsent(run);
  }, []);

  return null;
}
