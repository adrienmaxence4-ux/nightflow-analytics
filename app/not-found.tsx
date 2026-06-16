import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="mb-2 text-[10px] font-bold tracking-[3px] text-neon-cyansoft">
          ✦ PERDU DANS LA NUIT
        </div>
        <h1 className="text-[64px] font-extrabold leading-none tracking-tight">
          404
        </h1>
        <p className="mt-2 text-ink-dim">
          Cette page se trouve quelque part dans la galaxie.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-sm font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
