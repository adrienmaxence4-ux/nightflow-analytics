import Link from "next/link";
import { Moon } from "lucide-react";

/** Shared shell for the legal pages — readable prose on the night theme. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-5 py-10">
      <Link href="/" className="mb-10 flex w-fit items-center gap-3">
        <span className="relative grid h-9 w-9 flex-none place-items-center rounded-xl  bg-accent">
          <span className="absolute inset-[3px] rounded-[9px] bg-panel" />
          <Moon className="relative z-10 h-4 w-4 text-ink" strokeWidth={2.4} />
        </span>
        <span className="text-[14px] font-extrabold tracking-wide">
          NIGHTFLOW <span className="text-accent-text">ANALYTICS</span>
        </span>
      </Link>

      <article className="legal-prose">{children}</article>

      <footer className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-[12px] text-ink3">
        <Link href="/confidentialite" className="hover:text-ink">
          Confidentialité
        </Link>
        <Link href="/conditions" className="hover:text-ink">
          Conditions d&apos;utilisation
        </Link>
        <Link href="/mentions-legales" className="hover:text-ink">
          Mentions légales
        </Link>
        <Link href="/login" className="ml-auto hover:text-ink">
          ← Retour à Nightflow
        </Link>
      </footer>
    </div>
  );
}
