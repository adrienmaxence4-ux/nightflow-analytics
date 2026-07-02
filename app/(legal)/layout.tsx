import Link from "next/link";
import { Moon } from "lucide-react";

/** Shared shell for the legal pages — readable prose on the night theme. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-5 py-10">
      <Link href="/" className="mb-10 flex w-fit items-center gap-3">
        <span className="relative grid h-9 w-9 flex-none place-items-center rounded-xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
          <span className="absolute inset-[3px] rounded-[9px] bg-night-900" />
          <Moon className="relative z-10 h-4 w-4 text-white" strokeWidth={2.4} />
        </span>
        <span className="text-[14px] font-extrabold tracking-wide">
          NIGHTFLOW <span className="text-neon-cyansoft">ANALYTICS</span>
        </span>
      </Link>

      <article className="legal-prose">{children}</article>

      <footer className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-glass-border pt-6 text-[12px] text-ink-mut">
        <Link href="/confidentialite" className="hover:text-white">
          Confidentialité
        </Link>
        <Link href="/conditions" className="hover:text-white">
          Conditions d&apos;utilisation
        </Link>
        <Link href="/mentions-legales" className="hover:text-white">
          Mentions légales
        </Link>
        <Link href="/login" className="ml-auto hover:text-white">
          ← Retour à Nightflow
        </Link>
      </footer>
    </div>
  );
}
