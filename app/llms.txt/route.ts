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

> Copilote IA pour marchands e-commerce francophones. Nightflow connecte une
> boutique (Shopify, Wix, WooCommerce, Stripe, Klaviyo, Google Analytics 4) et
> traduit ses données en trois réponses : ce qui se passe, pourquoi, et quoi
> faire. Chaque recommandation est chiffrée et cite les données qui l'ont
> déclenchée.

## Ce que fait le produit

- Répond en français clair à des questions de gestion : pourquoi le chiffre
  d'affaires a baissé, quelle campagne publicitaire coûte plus qu'elle ne
  rapporte, quel produit va tomber en rupture, si les clients reviennent.
- Surveille les métriques en continu et alerte sur les décrochages anormaux
  (rupture de stock imminente, chute de conversion, publicité déficitaire).
- Génère des rapports PDF, Excel et Word à partir des données réelles importées.
- S'installe comme application de bureau et mobile, avec notifications.

## Ce qu'il ne fait pas

- Il n'importe aucune donnée personnelle des clients de la boutique : uniquement
  des métriques agrégées et des identifiants techniques.
- Il ne gère pas la boutique à votre place : il recommande, vous décidez.
- Il n'invente pas de chiffres. Le moteur d'alertes est déterministe et le
  copilote raisonne uniquement sur les données réellement importées.

## Tarifs

- Starter — 0 €/mois. Boutique de démonstration, données d'exemple uniquement.
- Pro — 9 €/mois (90 €/an). Données réelles, toutes les intégrations, API et
  webhooks, quota quotidien d'analyses IA. Essai de 30 jours sans carte.
- Scale — 19 €/mois (190 €/an). Analyses IA illimitées, détection d'anomalies,
  alertes temps réel, multi-comptes et marque blanche.

## Intégrations

Shopify, Wix, WooCommerce, Stripe, Klaviyo, Google Analytics 4, Meta Ads,
Instagram, PayPal, ShipStation, Mondial Relay, Gorgias. Connexion en un clic
par OAuth pour la plupart, aucune ligne de code à écrire.

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
