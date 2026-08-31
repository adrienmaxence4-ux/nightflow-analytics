import type { Metadata } from "next";
import Link from "next/link";
import {
  AppWindow,
  ArrowLeft,
  BellRing,
  Check,
  Download,
  Moon,
  Radar,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { DESKTOP, desktopDownloadReady } from "@/lib/desktop";

export const metadata: Metadata = {
  title: "Télécharger l'application de bureau — Nightflow Analytics",
  description:
    "Nightflow pour Windows : un agent qui surveille votre boutique en arrière-plan et vous notifie dès qu'une alerte apparaît, même fenêtre fermée.",
  alternates: { canonical: "/telecharger" },
  openGraph: {
    title: "Nightflow pour Windows",
    description:
      "Un agent de bureau qui veille sur votre boutique toutes les 30 minutes et vous alerte en natif.",
  },
};

const FEATURES = [
  {
    icon: Radar,
    title: "Veille toutes les 30 minutes",
    body: "Le moteur de détection tourne en continu sur vos vraies données : chute de revenu, rupture de stock, campagne non rentable.",
  },
  {
    icon: BellRing,
    title: "Notifications Windows natives",
    body: "Une alerte critique = une notification signée « Nightflow Analytics » avec le logo. Un clic ouvre la bonne page.",
  },
  {
    icon: AppWindow,
    title: "Vit dans la barre des tâches",
    body: "Fermer la fenêtre ne quitte pas l'app : l'agent reste dans la zone de notification et continue de surveiller.",
  },
  {
    icon: ShieldCheck,
    title: "Connexion = votre compte",
    body: "Vous vous connectez une fois (email ou Google) dans la fenêtre. Aucune clé, aucun réglage : c'est la session du site.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Téléchargez l'installateur",
    body: "Le fichier Nightflow-Setup.exe, environ " + DESKTOP.windowsSizeMb + " Mo.",
  },
  {
    n: 2,
    title: "Double-cliquez",
    body: "Pas d'assistant, pas de fenêtre à remplir : Nightflow s'installe pour votre compte et se lance tout seul. Un raccourci est ajouté au bureau et au menu Démarrer.",
  },
  {
    n: 3,
    title: "Connectez-vous une fois",
    body: "Email ou Google, dans la fenêtre qui s'ouvre. Ensuite l'agent démarre avec Windows et surveille en fond.",
  },
];

export default function TelechargerPage() {
  const available = desktopDownloadReady();

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24">
      {/* ── Header ── */}
      <header className="flex items-center gap-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 flex-none place-items-center rounded-xl  bg-accent">
            <span className="absolute inset-[3px] rounded-[9px] bg-panel" />
            <Moon className="relative z-10 h-4 w-4 text-ink" strokeWidth={2.4} />
          </span>
          <span className="text-[14px] font-extrabold tracking-wide">
            NIGHTFLOW <span className="text-accent-text">ANALYTICS</span>
          </span>
        </Link>
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink2 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="py-12 text-center sm:py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3 py-1 text-[11px] font-bold tracking-[0.06em] text-accent-text">
          <AppWindow className="h-3 w-3" /> APPLICATION DE BUREAU · WINDOWS
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
          Nightflow veille sur votre boutique,{" "}
          <span className="text-accent">
            même fenêtre fermée.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink2">
          Installez l&apos;agent de bureau : il interroge le moteur de détection
          toutes les 30 minutes et vous envoie une notification native dès qu&apos;un
          problème mérite votre attention.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {available ? (
            <a
              href="/api/desktop/download"
              className="flex items-center gap-2.5 rounded-xl bg-accent px-7 py-3.5 text-[17px] font-bold text-accent-ink transition hover:brightness-95"
            >
              <Download className="h-4 w-4" /> Télécharger pour Windows
            </a>
          ) : (
            <span className="flex cursor-not-allowed items-center gap-2.5 rounded-xl border border-line bg-panel2 px-7 py-3.5 text-[15px] font-bold text-ink3">
              <Download className="h-4 w-4" /> Bientôt disponible
            </span>
          )}
          <p className="text-[12px] text-ink3">
            v{DESKTOP.version} · ≈ {DESKTOP.windowsSizeMb} Mo · {DESKTOP.minOs}
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[16px] border border-line bg-panel2 p-5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel text-accent-text">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-[15px] font-bold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink2">
              {body}
            </p>
          </div>
        ))}
      </section>

      {/* ── Install steps ── */}
      <section className="mt-14">
        <h2 className="text-center text-[22px] font-extrabold">
          Installation en 3 étapes
        </h2>
        <ol className="mt-6 space-y-3">
          {STEPS.map(({ n, title, body }) => (
            <li
              key={n}
              className="flex gap-4 rounded-[16px] border border-line bg-panel2 p-5"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent text-[14px] font-extrabold text-accent-ink">
                {n}
              </span>
              <div>
                <h3 className="text-[15px] font-bold">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── SmartScreen note ── */}
      <div className="mt-8 flex gap-3 rounded-[16px] border border-bad/40 bg-bad-bg p-5">
        <TriangleAlert className="h-4 w-4 flex-none text-bad" />
        <div className="text-[13px] leading-relaxed text-ink2">
          <b className="text-ink">Windows affichera un avertissement bleu</b> à
          la première ouverture : l&apos;app n&apos;est pas encore signée par un
          certificat éditeur. Cliquez sur{" "}
          <span className="font-semibold text-ink">
            « Informations complémentaires »
          </span>{" "}
          puis{" "}
          <span className="font-semibold text-ink">
            « Exécuter quand même »
          </span>
          . Une seule fois — Windows retient ensuite votre choix.
        </div>
      </div>

      {/* ── Other platforms ── */}
      <p className="mt-10 text-center text-[13px] text-ink3">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-good" strokeWidth={3} /> Windows
          10 / 11
        </span>
        <span className="mx-3 opacity-40">·</span>
        macOS et Linux — bientôt. En attendant,{" "}
        <Link href="/dashboard" className="text-accent-text hover:underline">
          installez le site en PWA
        </Link>
        .
      </p>
    </div>
  );
}
