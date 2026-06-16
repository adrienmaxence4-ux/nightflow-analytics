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
  const { signIn, signUp, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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
