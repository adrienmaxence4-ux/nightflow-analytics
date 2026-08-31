"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link routes through /auth/callback, which exchanges the code
  // for a session before landing here. No session → the link was stale or reused.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setReady("no-session");
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setReady(data.user ? "ok" : "no-session");
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    toast("Mot de passe mis à jour — les autres sessions ont été déconnectées.");
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
        Nouveau mot de passe
      </h1>

      {ready === "no-session" ? (
        <p className="mb-2 mt-4 text-center text-[17px] leading-relaxed text-ink2">
          Ce lien a expiré ou a déjà servi.{" "}
          <Link
            href="/forgot-password"
            className="font-bold text-accent-text hover:underline"
          >
            Demande-en un nouveau
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-7 mt-2 text-center text-[17px] text-ink3">
            Choisis un mot de passe d&apos;au moins 10 caractères, différent de
            ceux que tu utilises ailleurs.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
              minLength={10}
              required
              disabled={ready !== "ok"}
              className={fieldClass}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirme le mot de passe"
              autoComplete="new-password"
              minLength={10}
              required
              disabled={ready !== "ok"}
              className={fieldClass}
            />
            {error && (
              <div className="rounded-[10px] border border-bad/40 bg-bad-bg px-3 py-2 text-[15px] text-bad">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || ready !== "ok"}
              className="mt-1 inline-flex min-h-[56px] w-full items-center justify-center rounded-[12px] bg-accent text-[19px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
