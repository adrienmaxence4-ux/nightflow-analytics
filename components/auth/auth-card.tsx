"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Moon } from "lucide-react";
import type HCaptcha from "@hcaptcha/react-hcaptcha";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { HcaptchaWidget } from "@/components/auth/hcaptcha-widget";
import { isHcaptchaConfigured } from "@/lib/env";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const toast = useToast();
  const { signIn, signUp, signInWithGoogle, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const captchaRef = useRef<HCaptcha>(null);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Only demo mode gets the click-through defaults; a real project always
    // requires a real email + password.
    const mail = demoMode ? email || "demo@nightflow.app" : email.trim();
    const pass = demoMode ? password || "demo1234" : password;
    if (!demoMode && (!mail || !pass)) {
      setError("Renseigne ton adresse email et ton mot de passe.");
      return;
    }
    if (!demoMode && isHcaptchaConfigured && !captchaToken) {
      setError("Complète le captcha ci-dessous.");
      return;
    }

    setBusy(true);
    const res = isLogin
      ? await signIn(mail, pass, captchaToken)
      : await signUp(mail, pass, captchaToken);
    setBusy(false);
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(undefined);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (!isLogin && "needsConfirmation" in res && res.needsConfirmation) {
      setNotice(
        "Compte créé. Ouvre le lien de confirmation qu'on vient de t'envoyer par email pour activer l'accès."
      );
      return;
    }
    toast(isLogin ? "Connexion réussie" : "Compte créé");
    router.push(isLogin ? "/dashboard" : "/onboarding");
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    const { error, redirecting } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleBusy(false);
      return;
    }
    if (redirecting) return; // le navigateur part vers Google
    toast("Connecté avec Google");
    router.push("/dashboard");
  };

  const fieldClass =
    "w-full min-h-[56px] rounded-[12px] border border-line bg-panel2 px-4 text-[18px] text-ink outline-none transition placeholder:text-ink3 focus-visible:border-accent";

  return (
    <div className="fade-up w-full max-w-[480px] rounded-xl border border-line bg-panel p-10 text-ink">
      <Link href="/" className="flex items-center justify-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-accent">
          <Moon className="h-6 w-6 text-accent-ink" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="font-display text-[20px] font-extrabold tracking-[0.02em]">
          NIGHTFLOW
        </span>
      </Link>

      <h1 className="mt-7 text-center font-display text-[30px] font-extrabold">
        {isLogin ? "Bon retour parmi nous" : "Créez votre compte"}
      </h1>
      <p className="mb-7 mt-2 text-center text-[17px] text-ink3">
        {isLogin
          ? "Connectez-vous pour piloter votre boutique."
          : "Commencez gratuitement, sans carte bancaire."}
      </p>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={google}
        disabled={googleBusy || busy}
        className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[12px] border border-line bg-[#f4efe4] text-[18px] font-bold text-[#14171b] transition hover:brightness-[0.97] disabled:opacity-60"
      >
        <GoogleIcon />
        {googleBusy
          ? "Connexion…"
          : `${isLogin ? "Se connecter" : "S'inscrire"} avec Google`}
      </button>

      <div className="my-6 flex items-center gap-4 text-[15px] text-ink3">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-2 block text-[16px] font-semibold text-ink2">
            Adresse email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@boutique.com"
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 flex items-baseline justify-between text-[16px] font-semibold text-ink2">
            Mot de passe
            {isLogin && (
              <Link
                href="/forgot-password"
                className="text-[14px] font-medium text-accent-text hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            )}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 10}
            className={fieldClass}
          />
          {!isLogin && (
            <span className="mt-1.5 block text-[13px] text-ink3">
              10 caractères minimum. Évite un mot de passe déjà utilisé ailleurs.
            </span>
          )}
        </label>

        <HcaptchaWidget
          ref={captchaRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(undefined)}
        />

        {error && (
          <div className="rounded-[10px] border border-bad/40 bg-bad-bg px-3 py-2 text-[15px] text-bad">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-[10px] border border-accent/40 bg-panel2 px-3 py-2 text-[15px] text-ink2">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[12px] bg-accent text-[19px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte"}
        </button>

        {!isLogin && (
          <p className="text-center text-[15px] leading-relaxed text-ink3">
            En créant un compte, vous acceptez les{" "}
            <Link href="/conditions" className="underline hover:text-ink">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline hover:text-ink">
              politique de confidentialité
            </Link>
            .
          </p>
        )}
      </form>

      {demoMode && (
        <p className="mt-5 rounded-[12px] border border-line px-4 py-3 text-center text-[15px] text-ink3">
          Mode démo actif — cliquez simplement sur le bouton pour entrer.
        </p>
      )}

      <p className="mt-6 text-center text-[17px] text-ink3">
        {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-bold text-accent-text hover:underline"
        >
          {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
