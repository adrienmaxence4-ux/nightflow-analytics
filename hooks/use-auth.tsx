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
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@nightflow.app",
  name: "Adrien Maxence",
  initials: "AM",
  store: "Nightflow Studio",
  plan: "Pro",
};

const STORAGE_KEY = "nightflow.demo.session";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  demoMode: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

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
        setUser(mapUser(data.user.email ?? "user@store.com"));
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? mapUser(session.user.email ?? "user@store.com") : null);
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
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? { error: error.message } : {};
    },
    [demoMode]
  );

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

  return (
    <AuthContext.Provider
      value={{ user, loading, demoMode, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapUser(email: string): AppUser {
  const initials = email.slice(0, 2).toUpperCase();
  return { ...DEMO_USER, email, initials };
}
