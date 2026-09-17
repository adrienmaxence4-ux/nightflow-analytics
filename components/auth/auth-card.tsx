"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Moon } from "lucide-react";
import type HCaptcha from "@hcaptcha/react-hcaptcha";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { HcaptchaWidget } from "@/components/auth/hcaptcha-widget";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isHcaptchaConfigured } from "@/lib/env";
import {
  parseSignup,
  SIGNUP_LIMITS,
  STORE_PLATFORMS,
  type SignupField,
  type SignupInput,
  type StorePlatform,
} from "@/lib/signup";

type FieldKey = SignupField | "captcha";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const toast = useToast();
  const { signIn, signUp, signInWithGoogle, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [platform, setPlatform] = useState<StorePlatform | "">("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: FieldKey; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const captchaRef = useRef<HCaptcha>(null);

  const isLogin = mode === "login";

  const fail = (message: string, field?: FieldKey) => {
    if (field) setFieldError({ field, message });
    else setError(message);
  };
  const errorFor = (field: FieldKey) =>
    fieldError?.field === field ? fieldError.message : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setNotice(null);

    // Only demo mode gets the click-through defaults; a real project always
    // requires real credentials.
    const mail = demoMode ? email || "demo@nightflow.app" : email.trim();
    const pass = demoMode ? password || "demo1234" : password;

    if (isLogin) {
      if (!demoMode && (!mail || !pass)) {
        fail("Renseignez votre adresse email et votre mot de passe.");
        return;
      }
      if (!demoMode && isHcaptchaConfigured && !captchaToken) {
        fail("Complétez la vérification anti-robot.", "captcha");
        return;
      }
      setBusy(true);
      const res = await signIn(mail, pass, captchaToken);
      setBusy(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(undefined);
      if (res.error) {
        fail(res.error);
        return;
      }
      toast("Connexion réussie");
      router.push("/dashboard");
      return;
    }

    let input: SignupInput;
    if (demoMode) {
      input = {
        fullName: fullName || "Démo",
        storeName: storeName || "MoonStore",
        storeDomain: "demo.nightflow.app",
        platform: platform || "other",
        email: mail,
        password: pass,
      };
    } else {
      const parsed = parseSignup({
        fullName,
        storeName,
        storeUrl,
        platform,
        email: mail,
        password: pass,
        captchaToken,
      });
      if (!parsed.ok) {
        fail(parsed.error, parsed.field);
        return;
      }
      if (isHcaptchaConfigured && !captchaToken) {
        fail("Complétez la vérification anti-robot.", "captcha");
        return;
      }
      input = parsed.value;
    }

    setBusy(true);
    const res = await signUp(input);
    setBusy(false);
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(undefined);
    if (res.error) {
      fail(res.error, res.field as FieldKey | undefined);
      return;
    }
    if (res.needsConfirmation) {
      setNotice(
        "Compte créé. Ouvrez le lien de confirmation envoyé par email pour activer l'accès."
      );
      return;
    }
    toast("Compte créé");
    if (demoMode) {
      router.push("/onboarding");
      return;
    }
    // The session cookie was set by the server: a full load so the app shell
    // reads it (a client-side push would still see no user and bounce to /login).
    window.location.assign("/onboarding");
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

  return (
    <div className="w-full max-w-[480px] rounded-xl border border-line bg-panel p-5 text-ink sm:p-10">
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
          : "Gratuit, sans carte bancaire. Confirmez votre email, puis lancez vos 30 jours de Pro d'un clic dans Facturation."}
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

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!isLogin && (
          <>
            <Field id="signup-name" label="Votre nom" error={errorFor("fullName")}>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Camille Durand"
                autoComplete="name"
                maxLength={SIGNUP_LIMITS.fullName}
                disabled={busy}
              />
            </Field>

            <Field id="signup-store" label="Nom de la boutique" error={errorFor("storeName")}>
                <Input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Maison Durand"
                  autoComplete="organization"
                  maxLength={SIGNUP_LIMITS.storeName}
                  disabled={busy}
                />
            </Field>
            <Field id="signup-platform" label="Plateforme" error={errorFor("platform")}>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as StorePlatform | "")}
                placeholder="Choisir"
                disabled={busy}
              >
                {STORE_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              id="signup-url"
              label="Adresse de la boutique"
              hint="L'adresse où vos clients commandent (ex. maboutique.fr). C'est cette boutique que vos 30 jours de Pro couvrent."
              error={errorFor("storeUrl")}
            >
              <Input
                type="text"
                inputMode="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="maboutique.fr"
                autoComplete="url"
                disabled={busy}
              />
            </Field>
          </>
        )}

        <Field id="auth-email" label="Adresse email" error={errorFor("email")}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@boutique.com"
            autoComplete="email"
            disabled={busy}
          />
        </Field>

        <Field
          id="auth-password"
          label="Mot de passe"
          labelEnd={
            isLogin ? (
              <Link
                href="/forgot-password"
                className="-my-3 inline-flex min-h-tap items-center text-label font-medium text-accent-text hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            ) : undefined
          }
          hint={
            isLogin
              ? undefined
              : `${SIGNUP_LIMITS.passwordMin} caractères minimum. Évitez un mot de passe déjà utilisé ailleurs.`
          }
          error={errorFor("password")}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : SIGNUP_LIMITS.passwordMin}
            disabled={busy}
          />
        </Field>

        <HcaptchaWidget
          ref={captchaRef}
          onVerify={(token) => {
            setCaptchaToken(token);
            if (fieldError?.field === "captcha") setFieldError(null);
          }}
          onExpire={() => setCaptchaToken(undefined)}
        />
        {fieldError?.field === "captcha" && (
          <p role="alert" className="-mt-2 text-center text-label font-medium text-bad">
            {fieldError.message}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-[10px] border border-bad/40 bg-bad-bg px-3 py-2 text-label font-medium text-bad"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-[10px] border border-accent/40 bg-panel2 px-3 py-2 text-label font-medium text-ink2"
          >
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[12px] bg-accent text-[19px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Un instant…" : isLogin ? "Se connecter" : "Créer mon compte gratuit"}
        </button>
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
