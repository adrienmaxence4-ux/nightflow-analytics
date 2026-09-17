"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Moon } from "lucide-react";
import type HCaptcha from "@hcaptcha/react-hcaptcha";
import { useAuth } from "@/hooks/use-auth";
import { HcaptchaWidget } from "@/components/auth/hcaptcha-widget";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isHcaptchaConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const { resetPassword, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const captchaRef = useRef<HCaptcha>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!demoMode && isHcaptchaConfigured && !captchaToken) {
      setError("Complétez la vérification anti-robot.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await resetPassword(email.trim(), captchaToken);
    setBusy(false);
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(undefined);
    // Always show the same confirmation: never reveal whether an address exists.
    if (error) setError(error);
    else setSent(true);
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
        Réinitialiser le mot de passe
      </h1>

      {sent ? (
        <p className="mb-2 mt-4 text-center text-[17px] leading-relaxed text-ink2">
          Si un compte utilise <strong>{email.trim()}</strong>, un lien de
          réinitialisation vient d&apos;être envoyé. Il expire au bout d&apos;une
          heure.
        </p>
      ) : (
        <>
          <p className="mb-7 mt-2 text-center text-[17px] text-ink3">
            Saisissez votre adresse — nous vous envoyons un lien pour en
            choisir un nouveau.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field id="reset-email" label="Adresse email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@boutique.com"
                autoComplete="email"
                required
                disabled={busy}
              />
            </Field>
            <HcaptchaWidget
              ref={captchaRef}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(undefined)}
            />
            {error && (
              <div
                role="alert"
                className="rounded-[10px] border border-bad/40 bg-bad-bg px-3 py-2 text-label font-medium text-bad"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[12px] bg-accent text-[19px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-[17px] text-ink3">
        <Link href="/login" className="font-bold text-accent-text hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
