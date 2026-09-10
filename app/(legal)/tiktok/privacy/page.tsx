import type { Metadata } from "next";
import Link from "next/link";
import { LangSwitch } from "../lang-switch";

export const metadata: Metadata = {
  title: "Politique de confidentialité — intégration TikTok | Nightflow Analytics",
  description:
    "Quelles données TikTok Nightflow Analytics lit, pourquoi, où elles sont stockées et comment les supprimer. Privacy Policy for the Nightflow Analytics TikTok integration.",
  alternates: { canonical: "/tiktok/privacy" },
};

export default function TikTokPrivacyPage() {
  return (
    <>
      {/* ── Français ─────────────────────────────────────────────────────── */}
      <section id="fr" className="scroll-mt-8">
        <LangSwitch active="fr" />

        <h1>Politique de confidentialité — intégration TikTok</h1>
        <p className="updated">Dernière mise à jour : 10 septembre 2026</p>

        <p>
          Cette politique décrit les données que <b>Nightflow Analytics</b> lit
          via les API TikTok lorsque vous connectez votre compte TikTok for
          Business, ce que nous en faisons, et comment les faire supprimer. Elle
          complète notre{" "}
          <Link href="/confidentialite">
            politique de confidentialité générale
          </Link>
          . Notre principe :{" "}
          <b>nous analysons des chiffres, pas des personnes</b>.
        </p>
        <p>
          Responsable de traitement : Adrien Maxence —{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
        </p>

        <h2>1. Les données TikTok que nous lisons</h2>
        <ul>
          <li>
            <b>Identité du compte publicitaire</b> — identifiant advertiser, nom
            du compte, devise, fuseau horaire.
          </li>
          <li>
            <b>Structure des campagnes</b> — identifiants et noms des campagnes,
            groupes d&apos;annonces et annonces, statut, budget.
          </li>
          <li>
            <b>Statistiques agrégées</b> — impressions, clics, dépense,
            conversions et valeur des conversions, par jour et par campagne.
          </li>
          <li>
            <b>Le jeton d&apos;accès</b> délivré par TikTok au moment de la
            connexion, nécessaire pour rafraîchir ces chiffres.
          </li>
        </ul>

        <h2>2. Ce que nous ne lisons pas</h2>
        <ul>
          <li>
            Aucune donnée personnelle d&apos;utilisateurs TikTok : ni profils,
            ni abonnés, ni commentaires, ni messages privés.
          </li>
          <li>
            Aucune audience personnalisée ni liste de clients. Nous n&apos;en
            créons pas et n&apos;en téléversons pas.
          </li>
          <li>Aucun contenu vidéo, aucune donnée de suivi individuel.</li>
          <li>
            Aucune donnée d&apos;un compte publicitaire que vous n&apos;avez pas
            connecté vous-même.
          </li>
        </ul>

        <h2>3. Pourquoi nous les traitons</h2>
        <p>
          Ces données servent uniquement à vous les restituer dans votre propre
          tableau de bord : rapprocher la dépense publicitaire de vos ventes
          réelles, calculer le ROAS et le coût d&apos;acquisition, produire vos
          rapports et déclencher des alertes (campagne qui décroche, budget qui
          s&apos;emballe). La base légale est l&apos;exécution du contrat qui
          nous lie ; la connexion résulte de votre action explicite et reste
          révocable à tout moment.
        </p>
        <p>
          Nous ne vendons pas ces données, ne les partageons avec aucun tiers à
          des fins commerciales, ne les utilisons pour aucun ciblage
          publicitaire et ne les recoupons avec aucune autre source pour
          identifier une personne.
        </p>

        <h2>4. Analyses générées par IA</h2>
        <p>
          Pour rédiger les recommandations du Copilot, un résumé agrégé de votre
          activité (chiffres et noms de campagnes) est transmis à nos
          fournisseurs d&apos;IA, <b>Anthropic</b> (Claude) et <b>Google</b>{" "}
          (Gemini). Aucun jeton d&apos;accès ne leur est transmis, et ces
          données ne servent pas à entraîner leurs modèles.
        </p>

        <h2>5. Où et comment ces données sont stockées</h2>
        <ul>
          <li>
            Base de données <b>Supabase</b>, région Union européenne ;
            application hébergée par <b>Vercel</b>, région Paris.
          </li>
          <li>
            Isolation stricte par compte au niveau de la base (Row-Level
            Security).
          </li>
          <li>
            Jetons d&apos;accès <b>chiffrés au repos</b> (AES-256-GCM), jamais
            exposés au navigateur.
          </li>
          <li>Transport chiffré (HTTPS/TLS) de bout en bout.</li>
        </ul>

        <h2>6. Sous-traitants</h2>
        <ul>
          <li>
            <b>Supabase</b> — base de données et authentification (UE).
          </li>
          <li>
            <b>Vercel</b> — hébergement de l&apos;application.
          </li>
          <li>
            <b>Anthropic</b> et <b>Google</b> — génération des analyses (voir
            §4).
          </li>
        </ul>
        <p>
          Les transferts hors Union européenne sont encadrés par les clauses
          contractuelles types de la Commission européenne.
        </p>

        <h2>7. Conservation et suppression</h2>
        <ul>
          <li>
            <b>Déconnexion</b> — depuis <b>Intégrations → Déconnecter</b>, le
            jeton d&apos;accès est supprimé immédiatement et aucune nouvelle
            donnée n&apos;est lue.
          </li>
          <li>
            <b>Historique</b> — les statistiques déjà importées sont conservées
            tant que votre compte est actif, pour que vos rapports passés
            restent lisibles. Vous pouvez en demander la suppression à tout
            moment.
          </li>
          <li>
            <b>Suppression du compte</b> — l&apos;ensemble de vos données, y
            compris les données TikTok, est supprimé sous 30 jours.
          </li>
        </ul>
        <p>
          Pour toute demande de suppression :{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>{" "}
          — le suivi d&apos;une demande est consultable sur la page{" "}
          <Link href="/suppression-donnees">suppression des données</Link>.
        </p>

        <h2>8. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement, de portabilité et
          d&apos;opposition, et pouvez retirer votre consentement à la connexion
          à tout moment. Écrivez-nous à{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
          . Vous pouvez également introduire une réclamation auprès de la CNIL.
        </p>

        <h2>9. Mineurs</h2>
        <p>
          Nightflow est un service professionnel qui ne s&apos;adresse pas aux
          mineurs et ne collecte pas sciemment leurs données.
        </p>

        <h2>10. Conformité TikTok</h2>
        <p>
          Nous utilisons les API TikTok conformément aux{" "}
          <i>TikTok Developer Terms of Service</i> et aux règles publicitaires
          de TikTok. Les données obtenues via ces API sont utilisées uniquement
          pour fournir le service décrit ici, à la personne qui a connecté le
          compte.
        </p>

        <h2>11. Modifications</h2>
        <p>
          Toute évolution significative est annoncée dans l&apos;application au
          moins 15 jours avant son entrée en vigueur, et la date en tête de page
          est mise à jour.
        </p>
      </section>

      {/* ── English ──────────────────────────────────────────────────────── */}
      <section id="en" className="mt-16 scroll-mt-8 border-t border-line pt-12">
        <LangSwitch active="en" />

        <h1>Privacy Policy — TikTok integration</h1>
        <p className="updated">Last updated: September 10, 2026</p>

        <p>
          This policy describes the data <b>Nightflow Analytics</b> reads
          through the TikTok APIs when you connect your TikTok for Business
          account, what we do with it, and how to have it deleted. It
          supplements our{" "}
          <Link href="/confidentialite">general Privacy Policy</Link>. Our
          principle: <b>we analyse numbers, not people</b>.
        </p>
        <p>
          Data controller: Adrien Maxence —{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
        </p>

        <h2>1. TikTok data we read</h2>
        <ul>
          <li>
            <b>Advertiser account identity</b> — advertiser ID, account name,
            currency, time zone.
          </li>
          <li>
            <b>Campaign structure</b> — IDs and names of campaigns, ad groups
            and ads, status, budget.
          </li>
          <li>
            <b>Aggregated metrics</b> — impressions, clicks, spend, conversions
            and conversion value, by day and by campaign.
          </li>
          <li>
            <b>The access token</b> issued by TikTok at connection time, needed
            to refresh those figures.
          </li>
        </ul>

        <h2>2. What we do not read</h2>
        <ul>
          <li>
            No personal data of TikTok users: no profiles, followers, comments
            or direct messages.
          </li>
          <li>
            No custom audiences and no customer lists. We neither create nor
            upload any.
          </li>
          <li>No video content and no individual tracking data.</li>
          <li>
            No data from an advertiser account you have not connected yourself.
          </li>
        </ul>

        <h2>3. Why we process it</h2>
        <p>
          This data is used only to show it back to you in your own dashboard:
          matching ad spend against real sales, computing ROAS and acquisition
          cost, producing your reports and raising alerts (a campaign dropping,
          a budget running away). The legal basis is the performance of our
          contract with you; the connection results from your explicit action
          and can be revoked at any time.
        </p>
        <p>
          We do not sell this data, do not share it with third parties for
          commercial purposes, do not use it for any ad targeting, and do not
          combine it with any other source to identify an individual.
        </p>

        <h2>4. AI-generated analysis</h2>
        <p>
          To write Copilot recommendations, an aggregated summary of your
          activity (figures and campaign names) is sent to our AI providers,{" "}
          <b>Anthropic</b> (Claude) and <b>Google</b> (Gemini). No access token
          is ever sent to them, and this data is not used to train their models.
        </p>

        <h2>5. Where and how the data is stored</h2>
        <ul>
          <li>
            <b>Supabase</b> database, European Union region; application hosted
            by <b>Vercel</b>, Paris region.
          </li>
          <li>Strict per-account isolation in the database (Row-Level Security).</li>
          <li>
            Access tokens <b>encrypted at rest</b> (AES-256-GCM), never exposed
            to the browser.
          </li>
          <li>Encrypted transport (HTTPS/TLS) end to end.</li>
        </ul>

        <h2>6. Sub-processors</h2>
        <ul>
          <li>
            <b>Supabase</b> — database and authentication (EU).
          </li>
          <li>
            <b>Vercel</b> — application hosting.
          </li>
          <li>
            <b>Anthropic</b> and <b>Google</b> — analysis generation (see
            section 4).
          </li>
        </ul>
        <p>
          Transfers outside the European Union are covered by the European
          Commission standard contractual clauses.
        </p>

        <h2>7. Retention and deletion</h2>
        <ul>
          <li>
            <b>Disconnection</b> — from <b>Integrations → Disconnect</b>, the
            access token is deleted immediately and no further data is read.
          </li>
          <li>
            <b>History</b> — metrics already imported are kept while your
            account is active, so your past reports stay readable. You can ask
            for their deletion at any time.
          </li>
          <li>
            <b>Account deletion</b> — all your data, TikTok data included, is
            deleted within 30 days.
          </li>
        </ul>
        <p>
          For any deletion request:{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>{" "}
          — the status of a request can be checked on the{" "}
          <Link href="/suppression-donnees">data deletion page</Link>.
        </p>

        <h2>8. Your rights</h2>
        <p>
          Under the GDPR you have the right to access, rectify, erase and port
          your data, to object to its processing, and to withdraw your consent
          to the connection at any time. Write to{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
          . You may also lodge a complaint with the French data protection
          authority (CNIL).
        </p>

        <h2>9. Minors</h2>
        <p>
          Nightflow is a professional service; it is not directed at minors and
          does not knowingly collect their data.
        </p>

        <h2>10. TikTok compliance</h2>
        <p>
          We use the TikTok APIs in accordance with the{" "}
          <i>TikTok Developer Terms of Service</i> and TikTok advertising
          policies. Data obtained through those APIs is used solely to deliver
          the service described here, to the person who connected the account.
        </p>

        <h2>11. Changes</h2>
        <p>
          Any significant change is announced in the application at least 15
          days before it takes effect, and the date at the top of this page is
          updated.
        </p>
      </section>
    </>
  );
}
