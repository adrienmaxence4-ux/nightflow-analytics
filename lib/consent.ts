/**
 * Consentement aux traceurs de mesure — logique pure, sans React.
 *
 * Règles appliquées (doctrine CNIL) :
 *  - Consentement PRÉALABLE : aucun traceur non essentiel ne se charge tant que
 *    la réponse est `null`. En cas de doute (stockage indisponible, valeur
 *    illisible, choix périmé) on renvoie `null` — donc on ne trace pas. Le
 *    défaut est fermé, jamais ouvert.
 *  - Refuser doit être aussi simple qu'accepter : un clic dans les deux cas,
 *    au même niveau. C'est la bannière qui le garantit visuellement.
 *  - Choix révocable : `clearConsent()` remet la bannière, et la page
 *    Confidentialité expose le bouton.
 *  - Choix périmé au bout de 6 mois : on redemande.
 *
 * Ne couvre PAS les cookies strictement nécessaires (session de connexion,
 * jeton d'intégration) : ils sont exemptés et ne passent pas par ici.
 */

export type ConsentChoice = "accepted" | "refused";

const KEY = "nightflow:consent";

/** Émis sur `window` à chaque changement, pour que les traceurs réagissent
 *  sans attendre un rechargement de page. */
export const CONSENT_EVENT = "nightflow:consent-change";

/** 6 mois. Au-delà, on repose la question. */
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000;

interface StoredConsent {
  choice: ConsentChoice;
  at: number;
}

function isChoice(v: unknown): v is ConsentChoice {
  return v === "accepted" || v === "refused";
}

/**
 * Le choix en cours, ou `null` s'il n'y en a pas (jamais répondu, périmé,
 * illisible, ou stockage inaccessible). `null` veut dire : ne rien charger et
 * afficher la bannière.
 */
export function readConsent(now: number = Date.now()): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { choice, at } = parsed as Partial<StoredConsent>;
    if (!isChoice(choice) || typeof at !== "number" || !Number.isFinite(at)) {
      return null;
    }
    // Un horodatage dans le futur signale une horloge trafiquée ou une valeur
    // bricolée : on repose la question plutôt que de faire confiance.
    if (at > now || now - at > MAX_AGE_MS) return null;
    return choice;
  } catch {
    return null;
  }
}

/** Enregistre le choix et prévient les abonnés dans l'onglet courant. */
export function writeConsent(choice: ConsentChoice, now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredConsent = { choice, at: now };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* stockage indisponible : le choix ne survivra pas au rechargement */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/** Efface le choix : la bannière réapparaît. Utilisé par « modifier mes
 *  préférences » sur la page Confidentialité. */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/** S'abonne aux changements. Renvoie la fonction de désabonnement. */
export function subscribeConsent(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_EVENT, fn);
  // `storage` couvre le cas d'un autre onglet du même site.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}
