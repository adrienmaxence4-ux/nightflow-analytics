import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="mb-2 text-[10px] font-bold tracking-[3px] text-accent-text">
          ✦ PERDU DANS LA NUIT
        </div>
        <h1 className="text-[64px] font-extrabold leading-none tracking-tight">
          404
        </h1>
        <p className="mt-2 text-ink2">
          Cette page se trouve quelque part dans la galaxie.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-[15px] font-bold text-accent-ink transition hover:brightness-95"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
