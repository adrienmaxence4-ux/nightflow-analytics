"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppUser } from "@/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string; redirecting?: boolean }>;
  signOut: () => Promise<void>;
  /** Sends a password-reset email (Supabase recovery link → /update-password). */
  resetPassword: (email: string) => Promise<{ error?: string }>;
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
      if (data.user) {
        setUser(mapUser(data.user.id, data.user.email ?? "user@store.com"));
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(
        session?.user
          ? mapUser(session.user.id, session.user.email ?? "user@store.com")
          : null
      );
    });
    return () => sub.subscription.unsubscribe();
  }, [demoMode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (demoMode) {
        const u = { ...DEMO_USER, email };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return {};
      }
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    [demoMode]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (demoMode) {
        const u = { ...DEMO_USER, email };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
        return {};
      }
      if (password.length < MIN_PASSWORD) {
        return { error: `Mot de passe : ${MIN_PASSWORD} caractères minimum.` };
      }
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) return { error: error.message };
      // No session back → the project requires email confirmation. Don't pretend
      // the user is in; the page shows "check your inbox" instead of redirecting.
      return { needsConfirmation: !data.session };
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
    return error ? { error: error.message } : { redirecting: true };
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
    async (email: string) => {
      if (demoMode) return {};
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      return error ? { error: error.message } : {};
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
      if (error) return { error: error.message };
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
    return error ? { error: error.message } : {};
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

function mapUser(id: string, email: string): AppUser {
  const initials = email.slice(0, 2).toUpperCase();
  return { ...DEMO_USER, id, email, initials };
}
