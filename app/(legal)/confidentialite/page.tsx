import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Nightflow Analytics",
};

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="updated">Dernière mise à jour : 24 juin 2026</p>

      <p>
        Nightflow Analytics («&nbsp;Nightflow&nbsp;», «&nbsp;nous&nbsp;») aide
        les marchands e-commerce à comprendre leurs performances. Cette
        politique explique quelles données nous traitons, pourquoi, et vos
        droits. Notre principe&nbsp;: <b>nous analysons des chiffres, pas des
        personnes</b>.
      </p>

      <h2>1. Données que nous collectons</h2>
      <ul>
        <li>
          <b>Compte</b> — votre e-mail et votre mot de passe (haché par notre
          prestataire d&apos;authentification Supabase). C&apos;est tout ce que
          nous savons de vous.
        </li>
        <li>
          <b>Données de boutique</b> — lorsque vous connectez un outil
          (Shopify, Wix, Stripe, Klaviyo, Google Analytics), nous importons des
          <b> données d&apos;activité agrégées</b>&nbsp;: produits, nombre de
          commandes, revenus, trafic, performance des campagnes.
        </li>
        <li>
          <b>Ce que nous ne collectons pas</b> — les données personnelles de
          vos clients (noms, e-mails, adresses) sont <b>exclues par
          construction</b> de notre modèle de données&nbsp;: nos connecteurs ne
          copient que des métriques et des identifiants techniques.
        </li>
      </ul>

      <h2>2. Comment nous utilisons ces données</h2>
      <ul>
        <li>Afficher vos tableaux de bord, alertes et rapports.</li>
        <li>
          Générer les analyses du Copilot IA&nbsp;: un résumé chiffré et anonyme
          de votre activité est transmis à notre fournisseur d&apos;IA
          (Anthropic) pour produire les conseils. Il n&apos;est pas utilisé
          pour entraîner des modèles.
        </li>
        <li>Détecter des anomalies (chute de CA, rupture de stock…).</li>
      </ul>
      <p>
        Nous ne vendons jamais vos données. Aucune publicité, aucun partage à
        des tiers à des fins commerciales.
      </p>

      <h2>3. Sécurité</h2>
      <ul>
        <li>Chaque compte est isolé au niveau de la base de données (Row-Level Security).</li>
        <li>
          Les jetons d&apos;accès de vos intégrations sont <b>chiffrés au repos</b>{" "}
          (AES-256-GCM).
        </li>
        <li>Connexions chiffrées (HTTPS/TLS) de bout en bout.</li>
      </ul>

      <h2>4. Paiements</h2>
      <p>
        Les abonnements sont traités par <b>Stripe</b>. Votre numéro de carte ne
        transite jamais par nos serveurs et nous n&apos;y avons pas accès.
      </p>

      <h2>5. Conservation et suppression</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. Vous pouvez
        déconnecter une intégration à tout moment (le jeton est supprimé) et
        demander la suppression complète de votre compte et de ses données en
        nous écrivant — la suppression est effective sous 30 jours.
      </p>

      <h2>6. Vos droits (RGPD)</h2>
      <p>
        Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
        rectification, de portabilité et d&apos;effacement de vos données, ainsi
        que d&apos;un droit d&apos;opposition. Pour l&apos;exercer&nbsp;:{" "}
        <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>.
      </p>

      <h2>7. Sous-traitants</h2>
      <ul>
        <li><b>Supabase</b> — base de données & authentification.</li>
        <li><b>Vercel</b> — hébergement de l&apos;application.</li>
        <li><b>Stripe</b> — paiement des abonnements.</li>
        <li><b>Anthropic</b> — génération des analyses IA.</li>
      </ul>
    </>
  );
}
