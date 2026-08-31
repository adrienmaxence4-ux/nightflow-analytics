import Link from "next/link";
import { headers } from "next/headers";
import { LandingThemeToggle } from "@/components/landing/theme-toggle-landing";

/**
 * Connexion / inscription. Indépendant du thème global de l'app : le conteneur
 * porte son propre `data-theme` (défaut sombre), partagé avec la landing via la
 * clé `nightflow:landing-theme`, et pilotable par l'interrupteur en haut.
 */
const AUTH_THEME_SCRIPT = `try{if(localStorage.getItem('nightflow:landing-theme')==='clair'){document.getElementById('auth-root').setAttribute('data-theme','clair')}}catch(e){}`;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get("x-nonce") ?? undefined;
  return (
    <div
      id="auth-root"
      data-theme="sombre"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10 text-ink [background:linear-gradient(180deg,#0d1219,#08090c_60%)] data-[theme=clair]:[background:linear-gradient(180deg,var(--panel),var(--bg)_60%)]"
    >
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: AUTH_THEME_SCRIPT }}
      />

      <div className="flex w-full max-w-[480px] justify-end">
        <LandingThemeToggle rootId="auth-root" />
      </div>

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
