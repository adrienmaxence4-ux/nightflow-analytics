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
        <p className="updated">Dernière mise à jour : 13 septembre 2026</p>

        <p>
          Cette politique décrit les données que <b>Nightflow Analytics</b> lit
          via les API TikTok (Login Kit et Display API) lorsque vous connectez
          votre compte TikTok, ce que nous en faisons, et comment les faire
          supprimer. Elle
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
        <p>
          Deux autorisations sont demandées à la connexion, et seulement ces
          deux-là :
        </p>
        <ul>
          <li>
            <b>Profil de base</b> (<i>user.info.basic</i>) — l&apos;identifiant
            technique du compte connecté (<i>open_id</i>). C&apos;est
            l&apos;autorisation minimale exigée par TikTok pour toute
            connexion ; nous n&apos;en lisons rien d&apos;autre.
          </li>
          <li>
            <b>Liste des vidéos publiques</b> (<i>video.list</i>) — pour vos
            20 dernières vidéos publiques : identifiant, date de publication,
            description, lien de partage et compteurs (vues, likes,
            commentaires, partages).
          </li>
        </ul>
        <p>
          TikTok nous délivre aussi, au moment de la connexion, un jeton
          d&apos;accès et un jeton de renouvellement, nécessaires pour relire
          ces chiffres sans vous redemander l&apos;autorisation.
        </p>
        <p>
          Les vidéos et leurs compteurs sont lus à l&apos;affichage de la page
          et une fois par heure en tâche de fond, pour vérifier que la
          connexion fonctionne toujours. Ils ne sont <b>pas stockés</b> : nous
          ne conservons que la connexion elle-même (identifiant du compte et
          jetons chiffrés).
        </p>

        <h2>2. Ce que nous ne lisons pas et ne faisons pas</h2>
        <ul>
          <li>
            Aucune donnée sur d&apos;autres personnes que vous : ni la liste de
            vos abonnés, ni le contenu des commentaires, ni les messages
            privés, ni l&apos;identité de qui a vu ou aimé une vidéo.
          </li>
          <li>
            Aucune vidéo privée ni brouillon, et aucun fichier vidéo : nous
            lisons des compteurs et un lien, jamais le contenu lui-même.
          </li>
          <li>
            <b>Aucune publication.</b> Nightflow ne poste, ne modifie et ne
            supprime rien sur votre compte TikTok.
          </li>
          <li>
            Aucune donnée publicitaire (dépense, campagnes) : les campagnes
            TikTok Ads ne passent pas par cette intégration.
          </li>
          <li>
            Aucune donnée d&apos;un compte que vous n&apos;avez pas connecté
            vous-même.
          </li>
        </ul>

        <h2>3. Pourquoi nous les traitons</h2>
        <p>
          Ces données servent uniquement à vous les restituer dans votre propre
          tableau de bord : voir quelles vidéos ont le plus été vues et
          partagées, les comparer à vos publications Instagram, et permettre au
          Copilot de vous suggérer quoi publier ensuite. Aucune vidéo n&apos;est
          reliée à un chiffre d&apos;affaires. La base légale est l&apos;exécution du
          contrat qui nous lie ; la connexion résulte de votre action explicite
          et reste révocable à tout moment.
        </p>
        <p>
          Nous ne vendons pas ces données, ne les partageons avec aucun tiers à
          des fins commerciales, ne les utilisons pour aucun ciblage
          publicitaire et ne les recoupons avec aucune autre source pour
          identifier une personne.
        </p>

        <h2>4. Analyses générées par IA</h2>
        <p>
          Pour rédiger les recommandations du Copilot, un résumé de votre
          activité (compteurs par vidéo et première ligne de sa description)
          est transmis à nos fournisseurs d&apos;IA, <b>Anthropic</b> (Claude)
          et <b>Google</b> (Gemini). Aucun jeton d&apos;accès ne leur est
          transmis, et ces données ne servent pas à entraîner leurs modèles.
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
            <b>Déconnexion</b> — depuis <b>Intégrations → Déconnecter</b>, les
            jetons sont supprimés immédiatement, l&apos;autorisation est
            révoquée auprès de TikTok, et aucune nouvelle donnée n&apos;est
            lue. Vous pouvez aussi retirer l&apos;accès depuis TikTok
            (Paramètres → Sécurité → Applications connectées).
          </li>
          <li>
            <b>Historique</b> — aucune statistique TikTok n&apos;étant stockée,
            la déconnexion efface tout ce que nous détenions.
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
          <i>TikTok Developer Terms of Service</i> et aux{" "}
          <i>Developer Guidelines</i>. Les données obtenues via ces API sont
          utilisées uniquement pour fournir le service décrit ici, à la
          personne qui a connecté le compte, et ne sont ni revendues ni
          transférées à un tiers.
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
        <p className="updated">Last updated: September 13, 2026</p>

        <p>
          This policy describes the data <b>Nightflow Analytics</b> reads
          through the TikTok APIs (Login Kit and Display API) when you connect
          your TikTok account, what we do with it, and how to have it deleted.
          It
          supplements our{" "}
          <Link href="/confidentialite">general Privacy Policy</Link>. Our
          principle: <b>we analyse numbers, not people</b>.
        </p>
        <p>
          Data controller: Adrien Maxence —{" "}
          <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
        </p>

        <h2>1. TikTok data we read</h2>
        <p>Two permissions are requested at connection time, and only these two:</p>
        <ul>
          <li>
            <b>Basic profile</b> (<i>user.info.basic</i>) — the technical
            identifier of the connected account (<i>open_id</i>). This is the
            minimum permission TikTok requires for any connection; we read
            nothing else from it.
          </li>
          <li>
            <b>Public video list</b> (<i>video.list</i>) — for your 20 most
            recent public videos: identifier, publication date, description,
            share link and counters (views, likes, comments, shares).
          </li>
        </ul>
        <p>
          At connection time TikTok also issues an access token and a refresh
          token, needed to read those figures again without asking you to
          authorise again.
        </p>
        <p>
          Videos and their counters are read when the page is displayed and
          once an hour in the background, to check that the connection still
          works. They are <b>not stored</b>: we only keep the connection itself
          (account identifier and encrypted tokens).
        </p>

        <h2>2. What we do not read or do</h2>
        <ul>
          <li>
            No data about anyone but you: no follower list, no comment
            contents, no direct messages, and no identity of who viewed or
            liked a video.
          </li>
          <li>
            No private videos or drafts, and no video files: we read counters
            and a link, never the content itself.
          </li>
          <li>
            <b>No posting.</b> Nightflow never publishes, edits or deletes
            anything on your TikTok account.
          </li>
          <li>
            No advertising data (spend, campaigns): TikTok Ads campaigns do not
            go through this integration.
          </li>
          <li>No data from an account you have not connected yourself.</li>
        </ul>

        <h2>3. Why we process it</h2>
        <p>
          This data is used only to show it back to you in your own dashboard:
          seeing which videos were viewed and shared the most, comparing them
          with your Instagram posts, and letting the Copilot suggest what to
          publish next. No video is ever tied to revenue. The legal basis is the performance of
          our contract with you; the connection results from your explicit
          action and can be revoked at any time.
        </p>
        <p>
          We do not sell this data, do not share it with third parties for
          commercial purposes, do not use it for any ad targeting, and do not
          combine it with any other source to identify an individual.
        </p>

        <h2>4. AI-generated analysis</h2>
        <p>
          To write Copilot recommendations, a summary of your activity
          (per-video counters and the first line of each description) is sent
          to our AI providers, <b>Anthropic</b> (Claude) and <b>Google</b>{" "}
          (Gemini). No access token is ever sent to them, and this data is not
          used to train their models.
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
            tokens are deleted immediately, the authorisation is revoked with
            TikTok, and no further data is read. You can also remove access
            from TikTok itself (Settings → Security → Connected apps).
          </li>
          <li>
            <b>History</b> — since no TikTok metrics are stored, disconnecting
            erases everything we held.
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
          <i>TikTok Developer Terms of Service</i> and the{" "}
          <i>Developer Guidelines</i>. Data obtained through those APIs is used
          solely to deliver the service described here, to the person who
          connected the account, and is neither sold nor transferred to any
          third party.
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
