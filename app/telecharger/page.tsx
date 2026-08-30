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
    title: "Lancez-le",
    body: "Windows demande une autorisation administrateur (installation pour tous les comptes, dans Program Files). L'assistant vous laisse ensuite choisir le dossier et le raccourci bureau.",
  },
  {
    n: 3,
    title: "Ouvrez Nightflow et connectez-vous",
    body: "Cochez « Lancer Nightflow Analytics » à la fin. Connectez-vous une fois — l'agent démarrera ensuite avec Windows.",
  },
];

export default function TelechargerPage() {
  const available = desktopDownloadReady();

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24">
      {/* ── Header ── */}
      <header className="flex items-center gap-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 flex-none place-items-center rounded-xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
            <span className="absolute inset-[3px] rounded-[9px] bg-night-900" />
            <Moon className="relative z-10 h-4 w-4 text-white" strokeWidth={2.4} />
          </span>
          <span className="text-[14px] font-extrabold tracking-wide">
            NIGHTFLOW <span className="text-neon-cyansoft">ANALYTICS</span>
          </span>
        </Link>
        <Link
          href="/"
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-dim hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="py-12 text-center sm:py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-glass-hi bg-glass px-3 py-1 text-[11px] font-bold tracking-wide text-neon-cyansoft">
          <AppWindow className="h-3 w-3" /> APPLICATION DE BUREAU · WINDOWS
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
          Nightflow veille sur votre boutique,{" "}
          <span className="bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink bg-clip-text text-transparent">
            même fenêtre fermée.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-dim">
          Installez l&apos;agent de bureau : il interroge le moteur de détection
          toutes les 30 minutes et vous envoie une notification native dès qu&apos;un
          problème mérite votre attention.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {available ? (
            <a
              href="/api/desktop/download"
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-7 py-3.5 text-[15px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
            >
              <Download className="h-4 w-4" /> Télécharger pour Windows
            </a>
          ) : (
            <span className="flex cursor-not-allowed items-center gap-2.5 rounded-xl border border-glass-border bg-glass px-7 py-3.5 text-[15px] font-bold text-ink-mut">
              <Download className="h-4 w-4" /> Bientôt disponible
            </span>
          )}
          <p className="text-[12px] text-ink-mut">
            v{DESKTOP.version} · ≈ {DESKTOP.windowsSizeMb} Mo · {DESKTOP.minOs}
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-glass-border bg-glass p-5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-glass-hi bg-night-900 text-neon-cyansoft">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-[15px] font-bold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
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
              className="flex gap-4 rounded-2xl border border-glass-border bg-glass p-5"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-[14px] font-extrabold text-night-950">
                {n}
              </span>
              <div>
                <h3 className="text-[15px] font-bold">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── SmartScreen note ── */}
      <div className="mt-8 flex gap-3 rounded-2xl border border-neon-pink/30 bg-neon-pink/5 p-5">
        <TriangleAlert className="h-4 w-4 flex-none text-neon-pinksoft" />
        <div className="text-[13px] leading-relaxed text-ink-dim">
          <b className="text-white">Windows affichera un avertissement bleu</b> à
          la première ouverture, et la fenêtre d&apos;autorisation indiquera
          «&nbsp;Éditeur inconnu&nbsp;» : l&apos;app n&apos;est pas encore signée
          par un certificat. Cliquez sur{" "}
          <span className="font-semibold text-white">
            « Informations complémentaires »
          </span>{" "}
          puis{" "}
          <span className="font-semibold text-white">
            « Exécuter quand même »
          </span>
          . C&apos;est le même installateur que celui lié ci-dessus.
        </div>
      </div>

      {/* ── Other platforms ── */}
      <p className="mt-10 text-center text-[13px] text-ink-mut">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-neon-lime" strokeWidth={3} /> Windows
          10 / 11
        </span>
        <span className="mx-3 opacity-40">·</span>
        macOS et Linux — bientôt. En attendant,{" "}
        <Link href="/dashboard" className="text-neon-cyansoft hover:underline">
          installez le site en PWA
        </Link>
        .
      </p>
    </div>
  );
}
