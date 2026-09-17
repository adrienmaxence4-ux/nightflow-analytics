"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { frenchAuthError } from "@/lib/auth-errors";
import type { SignupInput } from "@/lib/signup";
import type { AppUser } from "@/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error?: string }>;
  /** Inscription détaillée via /api/auth/signup (validation serveur). */
  signUp: (
    input: SignupInput
  ) => Promise<{ error?: string; field?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string; redirecting?: boolean }>;
  signOut: () => Promise<void>;
  /** Sends a password-reset email (Supabase recovery link → /update-password). */
  resetPassword: (
    email: string,
    captchaToken?: string
  ) => Promise<{ error?: string }>;
  /** Sets a new password for the current session, then revokes other sessions. */
  updatePassword: (password: string) => Promise<{ error?: string }>;
  /** Revokes every session for this user, on all devices. */
  signOutEverywhere: () => Promise<{ error?: string }>;
}

const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@moonstore.app",
  name: "Adrien",
  initials: "AM",
  store: "MoonStore",
  plan: "Pro",
};

const STORAGE_KEY = "nightflow.demo.session";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  demoMode: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signInWithGoogle: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  signOutEverywhere: async () => ({}),
});

const MIN_PASSWORD = 10;

/** Nom saisi à l'inscription (ou fourni par Google) ; sinon la partie locale de l'email. */
function displayName(u: User): string {
  const meta = u.user_metadata as Record<string, unknown>;
  const fromMeta = [meta.full_name, meta.name].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  return fromMeta?.trim() ?? (u.email ?? "").split("@")[0] ?? "";
}

function initialsOf(name: string, email: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const demoMode = !isSupabaseConfigured;

  useEffect(() => {
    // Demo mode: restore a fake session from localStorage.
    if (demoMode) {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      if (saved) setUser(JSON.parse(saved));
      setLoading(false);
      return;
    }

    // Real mode: read the Supabase session.
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(mapUser(data.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [demoMode]);

  const signIn = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      if (demoMode) {
        const u = { ...DEMO_USER, email };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return {};
      }
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      return error ? { error: frenchAuthError(error.message) } : {};
    },
    [demoMode]
  );

  const signUp = useCallback(
    async (input: SignupInput) => {
      if (demoMode) {
        const u = { ...DEMO_USER, email: input.email, name: input.fullName, store: input.storeName };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return {};
      }
      let res: Response;
      try {
        res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        return { error: frenchAuthError("network") };
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
        needsConfirmation?: boolean;
      };
      if (!res.ok) return { error: data.error ?? frenchAuthError(undefined), field: data.field };
      // No session back → the project requires email confirmation. Don't pretend
      // the user is in; the page shows "check your inbox" instead of redirecting.
      return { needsConfirmation: !!data.needsConfirmation };
    },
    [demoMode]
  );

  const signInWithGoogle = useCallback(async () => {
    if (demoMode) {
      // Pas de vrai OAuth en démo : on simule une connexion Google.
      const u = { ...DEMO_USER, email: "google.user@gmail.com", initials: "GU" };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUser(u);
      return {};
    }
    const supabase = createClient();
    if (!supabase) return { error: "Supabase non configuré" };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    // En cas de succès, le navigateur est redirigé vers Google.
    return error ? { error: frenchAuthError(error.message) } : { redirecting: true };
  }, [demoMode]);

  const signOut = useCallback(async () => {
    if (demoMode) {
      window.localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }
    const supabase = createClient();
    await supabase?.auth.signOut();
    setUser(null);
  }, [demoMode]);

  const resetPassword = useCallback(
    async (email: string, captchaToken?: string) => {
      if (demoMode) return {};
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        captchaToken,
      });
      return error ? { error: frenchAuthError(error.message) } : {};
    },
    [demoMode]
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (demoMode) return {};
      if (password.length < MIN_PASSWORD) {
        return { error: `Mot de passe : ${MIN_PASSWORD} caractères minimum.` };
      }
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: frenchAuthError(error.message) };
      // A password change must not leave old sessions alive elsewhere.
      await supabase.auth.signOut({ scope: "others" });
      return {};
    },
    [demoMode]
  );

  const signOutEverywhere = useCallback(async () => {
    if (demoMode) {
      window.localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return {};
    }
    const supabase = createClient();
    if (!supabase) return { error: "Supabase non configuré" };
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setUser(null);
    return error ? { error: frenchAuthError(error.message) } : {};
  }, [demoMode]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoMode,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        signOutEverywhere,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapUser(u: User): AppUser {
  const email = u.email ?? "";
  const name = displayName(u);
  const meta = u.user_metadata as Record<string, unknown>;
  return {
    id: u.id,
    email,
    name,
    initials: initialsOf(name, email),
    store: typeof meta.store_name === "string" && meta.store_name ? meta.store_name : null,
    plan: "Starter",
  };
}
