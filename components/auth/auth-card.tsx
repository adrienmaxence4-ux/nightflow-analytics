"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const toast = useToast();
  const { signIn, signUp, signInWithGoogle, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn = isLogin ? signIn : signUp;
    const { error } = await fn(email || "demo@nightflow.app", password || "demo1234");
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    toast(isLogin ? "Connexion réussie 🌙" : "Compte créé 🚀");
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
    toast("Connecté avec Google 🌙");
    router.push("/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card w-full max-w-md p-8"
    >
      <Link href="/" className="mb-6 flex items-center justify-center gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
          <span className="absolute inset-[3px] rounded-[9px] bg-night-900" />
          <Moon className="relative z-10 h-5 w-5 text-white" strokeWidth={2.4} />
        </span>
        <div className="leading-none">
          <div className="text-[16px] font-extrabold tracking-wide">NIGHTFLOW</div>
          <div className="mt-1 text-[9px] font-semibold tracking-[2.5px] text-neon-cyansoft">
            ANALYTICS
          </div>
        </div>
      </Link>

      <h1 className="text-center text-[22px] font-extrabold">
        {isLogin ? "Bon retour parmi nous" : "Créez votre compte"}
      </h1>
      <p className="mb-6 mt-1 text-center text-[13px] text-ink-dim">
        {isLogin
          ? "Connectez-vous pour piloter votre boutique."
          : "Commencez gratuitement, sans carte bancaire."}
      </p>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={google}
        disabled={googleBusy || busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-glass-border bg-white/95 py-2.5 text-[14px] font-semibold text-night-950 transition hover:bg-white hover:shadow-glow disabled:opacity-60"
      >
        <GoogleIcon />
        {googleBusy
          ? "Connexion…"
          : `${isLogin ? "Se connecter" : "S'inscrire"} avec Google`}
      </button>

      <div className="my-5 flex items-center gap-3 text-[11px] text-ink-mut">
        <span className="h-px flex-1 bg-glass-border" />
        ou
        <span className="h-px flex-1 bg-glass-border" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-mut">
            Email
          </span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@boutique.com"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-mut">
            Mot de passe
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </label>

        {error && (
          <div className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-[12px] text-neon-pinksoft">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
          {busy
            ? "Un instant…"
            : isLogin
              ? "Se connecter"
              : "Créer mon compte"}
        </Button>
      </form>

      {demoMode && (
        <p className="mt-4 rounded-lg border border-glass-border bg-glass-2 px-3 py-2 text-center text-[11px] text-ink-mut">
          ✦ Mode démo actif — cliquez simplement sur le bouton pour entrer.
          Connectez Supabase pour l&apos;auth réelle.
        </p>
      )}

      <p className="mt-5 text-center text-[13px] text-ink-dim">
        {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-bold text-neon-cyansoft hover:underline"
        >
          {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
        </Link>
      </p>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
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
