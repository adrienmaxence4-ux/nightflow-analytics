/**
 * Validation d'un avis visiteur. Pure et sans dépendance, pour être testée
 * seule — la route se contente de l'appeler.
 *
 * Principe : on nettoie et on borne, mais on ne devine jamais. Un champ
 * douteux est refusé, pas « réparé » en silence. Les longueurs correspondent
 * exactement aux contraintes CHECK de la table, pour qu'une saisie refusée le
 * soit ici avec un message clair plutôt que par une erreur Postgres opaque.
 */

export const FEEDBACK_LIMITS = {
  comment: 1000,
  name: 40,
  page: 200,
} as const;

export interface FeedbackInput {
  rating: number;
  comment: string | null;
  name: string | null;
  page: string | null;
}

export type FeedbackParse =
  | { ok: true; value: FeedbackInput }
  | { ok: false; error: string };

/**
 * Les caractères de contrôle n'ont rien à faire dans un avis : ils cassent
 * l'affichage et servent à masquer du texte. On garde tabulation, saut de
 * ligne et retour chariot, qui sont légitimes dans un commentaire multiligne.
 *
 * Comparaison par point de code plutôt qu'une classe de caractères : une
 * regex écrite avec ces caractères finit par contenir de vrais octets
 * invisibles dans le fichier source, illisibles en revue comme en diff.
 */
function estAffichable(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  if (c === 9 || c === 10 || c === 13) return true;
  return c >= 32 && c !== 127;
}

/** Nettoie une chaîne facultative : trim, vide → null, au-delà de la limite → refus. */
function optionalText(
  raw: unknown,
  max: number,
  champ: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: `${champ} invalide.` };
  const clean = Array.from(raw).filter(estAffichable).join("").trim();
  if (!clean) return { ok: true, value: null };
  if (clean.length > max) {
    return { ok: false, error: `${champ} trop long (${max} caractères maximum).` };
  }
  return { ok: true, value: clean };
}

export function parseFeedback(body: unknown): FeedbackParse {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Requête invalide." };
  }
  const { rating, comment, name, page } = body as Record<string, unknown>;

  // La note est le seul champ obligatoire : c'est le signal, le reste est bonus.
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choisis une note entre 1 et 5 étoiles." };
  }

  const c = optionalText(comment, FEEDBACK_LIMITS.comment, "Le commentaire");
  if (!c.ok) return c;
  const n = optionalText(name, FEEDBACK_LIMITS.name, "Le prénom");
  if (!n.ok) return n;
  const p = optionalText(page, FEEDBACK_LIMITS.page, "La page");
  if (!p.ok) return p;

  // On ne garde que le chemin : une URL complète emporterait le domaine et
  // d'éventuels paramètres (?a=, ?vip=) qui n'ont rien à faire dans un avis.
  let chemin = p.value;
  if (chemin) {
    const sansQuery = chemin.split(/[?#]/)[0];
    chemin = sansQuery.startsWith("/") ? sansQuery : null;
  }

  return {
    ok: true,
    value: { rating, comment: c.value, name: n.value, page: chemin },
  };
}
