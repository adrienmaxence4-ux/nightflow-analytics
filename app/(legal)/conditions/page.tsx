import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Nightflow Analytics",
};

export default function ConditionsPage() {
  return (
    <>
      <h1>Conditions d&apos;utilisation</h1>
      <p className="updated">Dernière mise à jour : 24 juin 2026</p>

      <p>
        En créant un compte Nightflow Analytics, vous acceptez les présentes
        conditions. Elles sont volontairement courtes et lisibles.
      </p>

      <h2>1. Le service</h2>
      <p>
        Nightflow est un tableau de bord d&apos;analyse e-commerce&nbsp;: il
        centralise les données de vos outils connectés (boutique, paiements,
        email, trafic) et produit des analyses, alertes et recommandations,
        y compris via une intelligence artificielle.
      </p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>
          Les clés et autorisations d&apos;accès que vous connectez doivent
          concerner <b>votre propre boutique</b> ou une boutique pour laquelle
          vous êtes mandaté.
        </li>
        <li>Un compte = un espace de données isolé. Vos données ne sont jamais visibles par un autre compte.</li>
      </ul>

      <h2>3. Abonnements et paiement</h2>
      <ul>
        <li>
          Le plan <b>Gratuit</b> donne accès à la démo. Les plans <b>Pro</b> et{" "}
          <b>Scale</b> sont facturés par Stripe, mensuellement ou annuellement,
          par prélèvement automatique.
        </li>
        <li>
          Vous pouvez changer de plan, mettre à jour votre carte ou résilier à
          tout moment depuis la page Facturation. La résiliation prend effet à
          la fin de la période payée.
        </li>
      </ul>

      <h2>4. Les conseils de l&apos;IA</h2>
      <p>
        Les analyses et recommandations du Copilot sont générées à partir de vos
        données réelles pour vous aider à décider. Elles constituent une{" "}
        <b>aide à la décision</b>, pas un conseil financier, comptable ou
        juridique&nbsp;: les décisions (budgets publicitaires, stocks, prix)
        restent les vôtres.
      </p>

      <h2>5. Usage acceptable</h2>
      <p>
        Il est interdit d&apos;utiliser Nightflow pour des activités illégales,
        de tenter d&apos;accéder aux données d&apos;autres comptes, de
        surcharger volontairement le service ou d&apos;en revendre l&apos;accès
        sans accord écrit.
      </p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>
        Nous visons une disponibilité maximale mais le service est fourni
        «&nbsp;en l&apos;état&nbsp;», sans garantie d&apos;absence
        d&apos;interruption. Notre responsabilité est limitée au montant payé au
        cours des 12 derniers mois. Vos données de boutique restent votre
        propriété — nous n&apos;en revendiquons aucune.
      </p>

      <h2>7. Modifications</h2>
      <p>
        Nous pouvons faire évoluer ces conditions&nbsp;; en cas de changement
        significatif, vous serez prévenu dans l&apos;application au moins 15
        jours avant l&apos;entrée en vigueur.
      </p>

      <h2>8. Contact</h2>
      <p>
        Une question&nbsp;?{" "}
        <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
      </p>
    </>
  );
}
