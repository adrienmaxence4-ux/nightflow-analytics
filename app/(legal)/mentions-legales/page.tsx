import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Nightflow Analytics",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <h1>Mentions légales</h1>
      <p className="updated">Dernière mise à jour : 24 juin 2026</p>

      <h2>Éditeur du site</h2>
      <p>
        Nightflow Analytics est édité par&nbsp;: <b>Adrien Maxence</b>
        <br />
        Contact&nbsp;:{" "}
        <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>
      </p>
      <p>
        {/* À compléter lors de l'immatriculation de la société : raison
            sociale, forme juridique, SIREN, adresse du siège, TVA. */}
        Les informations d&apos;immatriculation (raison sociale, SIREN, siège
        social) seront publiées ici dès la création de la structure juridique.
      </p>

      <h2>Hébergement</h2>
      <p>
        Application hébergée par <b>Vercel Inc.</b>, 440 N Barranca Ave #4133,
        Covina, CA 91723, États-Unis —{" "}
        <a href="https://vercel.com" target="_blank" rel="noreferrer">
          vercel.com
        </a>
        <br />
        Données stockées par <b>Supabase Inc.</b> —{" "}
        <a href="https://supabase.com" target="_blank" rel="noreferrer">
          supabase.com
        </a>{" "}
        (régions Union européenne).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, le logo, l&apos;interface et le contenu de Nightflow
        Analytics sont protégés. Toute reproduction sans autorisation écrite est
        interdite. Les données importées depuis vos outils restent votre
        propriété exclusive.
      </p>

      <h2>Signaler un problème</h2>
      <p>
        Pour signaler un contenu, un bug de sécurité ou exercer vos droits sur
        vos données&nbsp;:{" "}
        <a href="mailto:adrienmaxence4@gmail.com">adrienmaxence4@gmail.com</a>.
        Les failles de sécurité signalées de bonne foi sont traitées en
        priorité.
      </p>
    </>
  );
}
