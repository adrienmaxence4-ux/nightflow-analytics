"use client";

import { useEffect, useState } from "react";
import { clearConsent, readConsent, subscribeConsent } from "@/lib/consent";

const LABELS: Record<string, string> = {
  accepted: "Votre choix actuel : mesure d'audience acceptée.",
  refused: "Votre choix actuel : mesure d'audience refusée.",
};

/**
 * Rappelle le choix en cours et permet de le retirer — le retrait doit être
 * aussi simple que l'accord. Efface le choix, ce qui ramène la bannière.
 */
export function ConsentReset() {
  const [choice, setChoice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setChoice(readConsent());
      setReady(true);
    };
    sync();
    return subscribeConsent(sync);
  }, []);

  if (!ready) return null;

  return (
    <p>
      {choice ? LABELS[choice] : "Vous n'avez pas encore répondu à la bannière."}{" "}
      {choice && (
        <button
          type="button"
          onClick={clearConsent}
          className="underline underline-offset-2 hover:text-ink"
        >
          Modifier mes préférences
        </button>
      )}
    </p>
  );
}
