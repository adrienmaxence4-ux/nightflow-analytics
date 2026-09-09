import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Échelle typographique maison, déclarée dans tailwind.config.ts. Elle doit
 * être répétée ici : tailwind-merge ne lit pas la configuration Tailwind.
 *
 * Sans ça, `text-label` et consorts ressemblent à des classes de COULEUR, et
 * twMerge supprimait la vraie couleur écrite avant elles. Concrètement, tout
 * bouton `size="sm"` (`text-label`) perdait son `text-accent-ink` et retombait
 * sur la couleur héritée. En thème clair ça ne se voit pas — `--ink` et
 * `--accent-ink` y sont la même valeur — mais en sombre le bouton passe à du
 * crème sur ambre, autour de 2:1. Les tailles `md` et `lg` y échappent par
 * hasard, parce que `text-[17px]` est reconnu comme une taille arbitraire.
 */
const TAILLES_TEXTE = ["display", "stat", "title", "head", "body", "small", "label"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TAILLES_TEXTE }],
    },
  },
});

/** shadcn-style class combiner: clsx + tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
