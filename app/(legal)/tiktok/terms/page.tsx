import type { Metadata } from "next";
import Link from "next/link";
import { LangSwitch } from "../lang-switch";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — intégration TikTok | Nightflow Analytics",
  description:
    "Conditions d'utilisation de l'intégration TikTok de Nightflow Analytics. Terms of Service for the Nightflow Analytics TikTok integration.",
  alternates: { canonical: "/tiktok/terms" },
};

export default function TikTokTermsPage() {
  return (
    <>
      {/* ── Français ─────────────────────────────────────────────────────── */}
      <section id="fr" className="scroll-mt-8">
        <LangSwitch active="fr" />

        <h1>Conditions d&apos;utilisation — intégration TikTok</h1>
        <p className="updated">Dernière mise à jour : 10 septembre 2026</p>

        <p>
          Ces conditions encadrent l&apos;utilisation de l&apos;intégration
          TikTok de <b>Nightflow Analytics</b>, éditée par Adrien Maxence. Elles
          complètent nos{" "}
          <Link href="/conditions">conditions d&apos;utilisation générales</Link>{" "}
          et notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>, qui
          restent applicables.
        </p>

        <h2>1. Ce que fait l&apos;intégration</h2>
        <p>
          Nightflow est un tableau de bord d&apos;analyse pour marchands
          e-commerce. Une fois votre compte TikTok for Business connecté, nous
          lisons les statistiques de vos campagnes publicitaires (dépense,
          impressions, clics, conversions) et les affichons à côté de vos
          ventes, pour calculer un ROAS réel et repérer les campagnes qui
          perdent de l&apos;argent.
        </p>
        <p>
          <b>L&apos;accès est en lecture seule.</b> Nightflow ne publie rien, ne
          crée ni ne modifie aucune campagne, et ne dépense aucun budget
          publicitaire.
        </p>

        <h2>2. Qui peut l&apos;utiliser</h2>
        <ul>
          <li>Usage professionnel, réservé aux personnes majeures.</li>
          <li>
            Vous devez être titulaire du compte publicitaire TikTok connecté, ou
            disposer d&apos;un mandat du titulaire.
          </li>
          <li>
            Un compte Nightflow = un espace de données isolé. Vos données ne
            sont jamais visibles par un autre compte.
          </li>
        </ul>

        <h2>3. Vos engagements</h2>
        <ul>
          <li>
            Ne connecter que des comptes que vous êtes autorisé à consulter.
          </li>
          <li>
            Ne pas utiliser Nightflow pour contourner les règles de TikTok,
            extraire des données à des fins de revente, ou reconstituer le
            profil d&apos;une personne.
          </li>
          <li>
            Respecter les conditions TikTok applicables à votre compte
            publicitaire.
          </li>
        </ul>

        <h2>4. Nos engagements</h2>
        <ul>
          <li>
            Ne lire que les données nécessaires aux analyses décrites au point
            1.
          </li>
          <li>
            Vous laisser révoquer l&apos;accès à tout moment depuis{" "}
            <b>Intégrations → Déconnecter</b> : le jeton est supprimé
            immédiatement.
          </li>
          <li>
            Ne jamais vendre vos données, ne pas les utiliser à des fins
            publicitaires, ne pas les utiliser pour entraîner des modèles.
          </li>
        </ul>

        <h2>5. Les analyses de l&apos;IA</h2>
        <p>
          Les recommandations du Copilot sont générées à partir de vos chiffres
          réels. Elles constituent une <b>aide à la décision</b>, pas un conseil
          financier, comptable ou juridique : les arbitrages de budget
          publicitaire restent les vôtres.
        </p>

        <h2>6. Abonnement</h2>
        <p>
          L&apos;intégration TikTok est incluse dans votre plan Nightflow. La
          facturation, les changements de plan et la résiliation sont décrits
          dans nos{" "}
          <Link href="/conditions">
            conditions d&apos;utilisation générales
          </Link>
          .
        </p>

        <h2>7. Relation avec TikTok</h2>
        <p>
          Nightflow Analytics est un service indépendant. Il n&apos;est ni
          affilié, ni sponsorisé, ni approuvé par TikTok Pte. Ltd. ou ses
          sociétés affiliées ; TikTok est une marque de son propriétaire. Votre
          utilisation de TikTok reste soumise aux conditions de TikTok. Nous
          utilisons les API TikTok conformément aux{" "}
          <i>TikTok Developer Terms of Service</i> et aux règles publicitaires
          de TikTok.
        </p>

        <h2>8. Disponibilité et responsabilité</h2>
        <p>
          Le service est fourni en l&apos;état, sans garantie d&apos;absence
          d&apos;interruption. Si TikTok modifie, restreint ou suspend
          l&apos;accès à ses API, l&apos;intégration peut cesser de fonctionner
          sans que cela nous soit imputable. Notre responsabilité est limitée au
          montant que vous avez payé au cours des 12 derniers mois.
        </p>

        <h2>9. Fin de l&apos;accès</h2>
        <p>
          Vous pouvez déconnecter TikTok à tout moment. Nous pouvons suspendre
          l&apos;intégration en cas d&apos;usage abusif ou de demande de TikTok.
          Dans les deux cas, les données TikTok associées à votre compte sont
          supprimées sous 30 jours — voir la{" "}
          <Link href="/tiktok/privacy">
            politique de confidentialité TikTok
          </Link>
          .
        </p>

        <h2>10. Modifications</h2>
        <p>
          En cas de changement significatif, vous serez prévenu dans
          l&apos;application au moins 15 jours avant l&apos;entrée en vigueur.
        </p>

        <h2>11. Droit applicable</h2>
        <p>
          Ces conditions sont régies par le droit français. À défaut de
          résolution amiable, les tribunaux français sont compétents, sous
          réserve des règles protectrices applicables aux consommateurs.
        </p>

        <h2>12. Contact</h2>
        <p>
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
        </p>
      </section>

      {/* ── English ──────────────────────────────────────────────────────── */}
      <section id="en" className="mt-16 scroll-mt-8 border-t border-line pt-12">
        <LangSwitch active="en" />

        <h1>Terms of Service — TikTok integration</h1>
        <p className="updated">Last updated: September 10, 2026</p>

        <p>
          These terms govern the use of the TikTok integration of{" "}
          <b>Nightflow Analytics</b>, operated by Adrien Maxence. They
          supplement our <Link href="/conditions">general Terms of Service</Link>{" "}
          and our <Link href="/confidentialite">Privacy Policy</Link>, which
          remain applicable.
        </p>

        <h2>1. What the integration does</h2>
        <p>
          Nightflow is an analytics dashboard for e-commerce merchants. Once you
          connect your TikTok for Business account, we read your advertising
          metrics (spend, impressions, clicks, conversions) and display them
          next to your sales, so you can see a real ROAS and spot campaigns that
          lose money.
        </p>
        <p>
          <b>Access is read-only.</b> Nightflow does not post content, does not
          create or edit campaigns, and never spends your advertising budget.
        </p>

        <h2>2. Who may use it</h2>
        <ul>
          <li>Business use only, by adults.</li>
          <li>
            You must own the connected TikTok advertiser account, or be
            authorised by its owner.
          </li>
          <li>
            One Nightflow account is one isolated data space. Your data is never
            visible to another account.
          </li>
        </ul>

        <h2>3. Your commitments</h2>
        <ul>
          <li>Only connect accounts you are allowed to access.</li>
          <li>
            Do not use Nightflow to circumvent TikTok rules, to extract data for
            resale, or to build a profile of an individual.
          </li>
          <li>
            Comply with the TikTok terms that apply to your advertiser account.
          </li>
        </ul>

        <h2>4. Our commitments</h2>
        <ul>
          <li>
            Read only the data needed for the analytics described in section 1.
          </li>
          <li>
            Let you revoke access at any time from{" "}
            <b>Integrations → Disconnect</b>: the token is deleted immediately.
          </li>
          <li>
            Never sell your data, never use it for advertising, never use it to
            train models.
          </li>
        </ul>

        <h2>5. AI analysis</h2>
        <p>
          Copilot recommendations are generated from your own figures. They are
          a <b>decision aid</b>, not financial, accounting or legal advice:
          budget decisions remain yours.
        </p>

        <h2>6. Subscription</h2>
        <p>
          The TikTok integration is included in your Nightflow plan. Billing,
          plan changes and cancellation are described in our{" "}
          <Link href="/conditions">general Terms of Service</Link>.
        </p>

        <h2>7. Relationship with TikTok</h2>
        <p>
          Nightflow Analytics is an independent service. It is not affiliated
          with, sponsored by, or endorsed by TikTok Pte. Ltd. or its affiliates;
          TikTok is a trademark of its owner. Your use of TikTok remains subject
          to TikTok terms. We use the TikTok APIs in accordance with the{" "}
          <i>TikTok Developer Terms of Service</i> and TikTok advertising
          policies.
        </p>

        <h2>8. Availability and liability</h2>
        <p>
          The service is provided as is, without a guarantee of uninterrupted
          availability. If TikTok changes, restricts or suspends access to its
          APIs, the integration may stop working through no fault of ours. Our
          liability is capped at the amount you paid over the last 12 months.
        </p>

        <h2>9. Ending access</h2>
        <p>
          You can disconnect TikTok at any time. We may suspend the integration
          in case of abuse or at TikTok request. In both cases, the TikTok data
          held for your account is deleted within 30 days — see the{" "}
          <Link href="/tiktok/privacy">TikTok Privacy Policy</Link>.
        </p>

        <h2>10. Changes</h2>
        <p>
          For any significant change, you will be notified in the application at
          least 15 days before it takes effect.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These terms are governed by French law. Failing an amicable
          resolution, French courts have jurisdiction, subject to the mandatory
          rules protecting consumers.
        </p>

        <h2>12. Contact</h2>
        <p>
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
        </p>
      </section>
    </>
  );
}
