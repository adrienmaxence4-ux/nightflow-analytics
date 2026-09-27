const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app";

/**
 * GET /llms.txt — fiche de lecture pour les moteurs de réponse (ChatGPT,
 * Perplexity, Claude, AI Overviews).
 *
 * Répondait 404. Or un marchand qui demande « meilleur outil analytics Shopify
 * en français » obtient aujourd'hui une réponse rédigée, pas dix liens bleus :
 * sans page lisible par une machine, on n'est pas dans la réponse.
 *
 * Convention llms.txt : un titre, un résumé en citation, puis des sections de
 * liens. Écrit en français, comme le produit et son audience.
 *
 * Tenu à jour à la main, et volontairement court : ce fichier doit rester vrai.
 * Il ne promet aucune fonctionnalité que le produit n'a pas — une fiche qui
 * exagère se fait contredire par la première capture d'écran venue.
 */
export const dynamic = "force-static";

const CONTENU = `# Nightflow Analytics

> Nightflow surveille une boutique e-commerce francophone (Shopify, WooCommerce,
> Wix, Stripe, Klaviyo, Google Analytics 4), détecte les changements
> importants, explique la cause probable avec les données disponibles et dit
> quoi faire — dans un brief quotidien qui se lit en 30 secondes. Pour les
> petites et moyennes boutiques qui ne veulent pas passer leur journée dans
> Analytics.

## Ce que fait le produit

- Un Daily Brief chaque matin : ce qui mérite l'attention du marchand, classé
  par gravité (action nécessaire, à surveiller, positif, information), avec
  depuis quand, où, et par rapport à quoi.
- Un moteur de détection déterministe qui compare chaque métrique à sa période
  précédente et cite les chiffres exacts qui ont déclenché l'alerte : chute de
  chiffre d'affaires, conversion en baisse, rupture de stock imminente,
  campagne publicitaire déficitaire.
- Des réponses en français à des questions de gestion (« pourquoi mes ventes
  baissent ? », « où est-ce que je perds de l'argent ? », « qu'est-ce qui
  fonctionne ? »), fondées sur les données importées.
- Des rapports PDF, Excel et Word générés à partir des données réelles.
- Des notifications sur ordinateur (agent Windows) et téléphone quand une
  alerte tombe.

## Ce qu'il ne fait pas

- Il n'importe aucune donnée personnelle des clients de la boutique : des
  métriques agrégées et des identifiants techniques, jamais des noms.
- Il ne modifie rien dans la boutique sans un clic explicite du marchand, et
  chaque action appliquée se défait en un clic.
- Il n'invente pas de chiffres : le moteur d'alertes est déterministe et les
  réponses IA reposent sur les données importées ; quand une donnée manque, il
  le dit.

## Tarifs

- Starter — 0 €/mois. Boutique de démonstration MoonStore, aucune donnée réelle.
- Pro — 9 €/mois (90 €/an). Boutique connectée, Daily Brief et alertes,
  rapports, 20 questions au Copilote par jour. 30 jours gratuits sans carte.

## Intégrations

Shopify, WooCommerce et Wix (clé ou jeton en lecture seule créé depuis la
boutique), Stripe (clé restreinte en lecture seule), Klaviyo (OAuth),
Google Analytics 4. Meta Ads et TikTok Ads arrivent via Windsor.ai.

## Confidentialité

Chaque compte est isolé au niveau de la base de données (Row-Level Security).
Les jetons d'accès des intégrations sont chiffrés au repos (AES-256-GCM).
Aucune donnée n'est revendue. La mesure d'audience détaillée est soumise au
consentement préalable du visiteur et ne se charge pas sans lui.

## Liens

- [Accueil](${BASE}/)
- [Créer un compte](${BASE}/signup)
- [Application de bureau](${BASE}/telecharger)
- [Politique de confidentialité](${BASE}/confidentialite)
- [Conditions d'utilisation](${BASE}/conditions)
- [Mentions légales](${BASE}/mentions-legales)

## Contact

adrienmaxence4@gmail.com
`;

export function GET() {
  return new Response(CONTENU, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Fichier stable : on laisse les moteurs le garder en cache une heure,
      // avec réutilisation tolérée pendant la revalidation.
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
