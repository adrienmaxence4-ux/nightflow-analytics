import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DataDeletionRequestRow } from "@/types/database";

/**
 * Public status page for a data deletion request.
 *
 * Meta requires the deletion callback to return a URL where a person can read,
 * in plain language, what happened to their request. It is deliberately public
 * and unauthenticated: someone who has removed the app can no longer log in,
 * so demanding a session here would make the page useless to the only people
 * it exists for. The confirmation code is the only key, and it reveals nothing
 * beyond the fact that a deletion ran.
 */
export const metadata: Metadata = {
  title: "Suppression de vos données — Nightflow Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function findRequest(
  code: string
): Promise<DataDeletionRequestRow | null> {
  const admin = createAdminClient();
  if (!admin || !code) return null;
  try {
    const { data } = await admin
      .from("data_deletion_requests")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .limit(1);
    return (data?.[0] as DataDeletionRequestRow | undefined) ?? null;
  } catch {
    return null;
  }
}

const STATUS: Record<string, { label: string; tone: string }> = {
  completed: { label: "Terminée", tone: "text-good" },
  partial: { label: "Partielle", tone: "text-warn" },
  failed: { label: "Échouée", tone: "text-bad" },
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code ?? "";
  const request = await findRequest(code);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-14">
      <header>
        <h1 className="text-title">Suppression de vos données</h1>
        <p className="mt-2 text-body text-ink2">
          Cette page explique ce que Nightflow Analytics conserve lorsque vous
          connectez un compte, et ce qui est supprimé lorsque vous retirez
          l&apos;accès.
        </p>
      </header>

      {code && (
        <section className="rounded-[16px] border border-line bg-panel2 p-5">
          <div className="text-[10px] font-bold tracking-[0.06em] text-ink3">
            Demande {code.toUpperCase()}
          </div>
          {request ? (
            <>
              <p className={`mt-1 text-[20px] font-extrabold ${STATUS[request.status]?.tone ?? ""}`}>
                {STATUS[request.status]?.label ?? request.status}
              </p>
              <p className="mt-2 text-body text-ink2">
                Reçue le{" "}
                {new Date(request.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . La connexion {request.provider} et le jeton d&apos;accès
                associé ont été supprimés de nos serveurs.
              </p>
            </>
          ) : (
            <p className="mt-2 text-body text-ink2">
              Aucune demande ne correspond à ce code. Il a peut-être été mal
              recopié — les codes ne contiennent ni O, ni I, ni 0, ni 1.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-head">Ce que nous conservons</h2>
        <p className="text-body text-ink2">
          Pour un compte Instagram connecté, Nightflow conserve exactement deux
          choses : un jeton d&apos;accès chiffré, et l&apos;identifiant du
          compte. C&apos;est tout.
        </p>
        <p className="text-body text-ink2">
          Les vues, les mentions J&apos;aime, la portée et les légendes de vos
          publications ne sont <b className="text-ink">jamais enregistrées</b> :
          elles sont lues auprès de la plateforme à chaque affichage de la page,
          puis oubliées. Il n&apos;y a donc pas d&apos;historique de vos
          publications à supprimer chez nous.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-head">Comment supprimer vos données</h2>
        <p className="text-body text-ink2">
          Retirez Nightflow depuis{" "}
          <b className="text-ink">
            Instagram → Paramètres → Applications et sites Web
          </b>
          . Instagram nous prévient immédiatement, le jeton est effacé et la
          connexion passe en «&nbsp;déconnectée&nbsp;».
        </p>
        <p className="text-body text-ink2">
          Depuis Nightflow, le bouton{" "}
          <b className="text-ink">Déconnecter</b> sur la page Intégrations
          produit le même résultat.
        </p>
        <p className="text-body text-ink2">
          Pour toute autre demande, écrivez à{" "}
          <a
            href="mailto:adrienmaxence4@gmail.com"
            className="text-accent-text hover:underline"
          >
            adrienmaxence4@gmail.com
          </a>
          . Nous répondons sous 30 jours, conformément au RGPD.
        </p>
      </section>
    </main>
  );
}
