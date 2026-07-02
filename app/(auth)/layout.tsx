import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      {children}
      {/* Trust footer — visible at the exact moment users decide to sign up. */}
      <p className="max-w-sm text-center text-[11px] leading-relaxed text-ink-mut">
        En continuant, vous acceptez nos{" "}
        <Link href="/conditions" className="underline underline-offset-2 hover:text-white">
          conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-white">
          politique de confidentialité
        </Link>
        . Vos données sont chiffrées et ne sont jamais revendues.
      </p>
    </div>
  );
}
