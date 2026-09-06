import { describe, expect, it } from "vitest";
import { parseFeedback } from "@/lib/feedback";

/**
 * La validation est la seule barrière entre un visiteur anonyme et la table :
 * il n'y a aucune policy RLS derrière, uniquement le service role. Ce qui
 * passe ici est écrit tel quel.
 */

const ok = (body: unknown) => {
  const r = parseFeedback(body);
  if (!r.ok) throw new Error(`refusé alors qu'attendu valide : ${r.error}`);
  return r.value;
};

describe("parseFeedback", () => {
  it("accepte une note seule — c'est le seul champ requis", () => {
    expect(ok({ rating: 4 })).toEqual({
      rating: 4,
      comment: null,
      name: null,
      page: null,
    });
  });

  it("refuse une note hors bornes, non entière ou absente", () => {
    for (const rating of [0, 6, -1, 3.5, "4", null, undefined, NaN]) {
      expect(parseFeedback({ rating }).ok).toBe(false);
    }
  });

  it("refuse un corps qui n'est pas un objet", () => {
    for (const body of [null, undefined, "texte", 42, true]) {
      expect(parseFeedback(body).ok).toBe(false);
    }
  });

  it("ramène une chaîne vide ou blanche à null", () => {
    expect(ok({ rating: 5, comment: "   ", name: "" })).toMatchObject({
      comment: null,
      name: null,
    });
  });

  it("refuse au-delà des limites plutôt que de tronquer en silence", () => {
    expect(parseFeedback({ rating: 5, comment: "a".repeat(1001) }).ok).toBe(false);
    expect(parseFeedback({ rating: 5, comment: "a".repeat(1000) }).ok).toBe(true);
    expect(parseFeedback({ rating: 5, name: "a".repeat(41) }).ok).toBe(false);
  });

  it("retire les caracteres de controle mais garde les sauts de ligne", () => {
    // fromCharCode plutot que des echappees ecrites a la main : les caracteres
    // de controle restent hors du fichier source, ou ils seraient invisibles.
    const [nul, saut, cloche] = [0, 10, 7].map((c) => String.fromCharCode(c));
    const v = ok({ rating: 5, comment: `ligne 1${nul}${saut}ligne 2${cloche} fin` });
    expect(v.comment).toBe(`ligne 1${saut}ligne 2 fin`);
  });

  it("ne garde que le chemin de la page, sans domaine ni paramètres", () => {
    expect(ok({ rating: 5, page: "/tarifs?a=INSTA01" }).page).toBe("/tarifs");
    expect(ok({ rating: 5, page: "/" }).page).toBe("/");
    expect(ok({ rating: 5, page: "/faq#bloc" }).page).toBe("/faq");
    // Une URL absolue emporterait le domaine : on préfère ne rien stocker.
    expect(ok({ rating: 5, page: "https://exemple.fr/tarifs?vip=CODE" }).page).toBeNull();
  });

  it("refuse un champ texte qui n'est pas une chaîne", () => {
    expect(parseFeedback({ rating: 5, comment: 42 }).ok).toBe(false);
    expect(parseFeedback({ rating: 5, name: { a: 1 } }).ok).toBe(false);
  });

  it("laisse le texte intact — l'échappement est le travail du rendu", () => {
    // React échappe à l'affichage ; réécrire ici corromprait un avis honnête
    // qui parlerait de code.
    const v = ok({ rating: 3, comment: "<script>alert(1)</script> & co" });
    expect(v.comment).toBe("<script>alert(1)</script> & co");
  });
});
