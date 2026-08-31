import Link from "next/link";

/**
 * Connexion / inscription — toujours en mode sombre : le conteneur force
 * `data-theme="sombre"` pour toute la page, quel que soit le thème global.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="sombre"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10 text-ink [background:linear-gradient(180deg,#0d1219,#08090c_60%)]"
    >
      {children}
      {/* Rappel de confiance — au moment exact où l'utilisateur décide. */}
      <p className="max-w-[480px] text-center text-[15px] leading-relaxed text-ink3">
        En continuant, vous acceptez nos{" "}
        <Link href="/conditions" className="underline underline-offset-2 hover:text-ink">
          conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
          politique de confidentialité
        </Link>
        . Vos données sont chiffrées et ne sont jamais revendues.
      </p>
    </div>
  );
}
