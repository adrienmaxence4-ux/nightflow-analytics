import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

/**
 * `noindex` comme /login : le formulaire lui-même n'a rien à dire à Google,
 * c'est la landing qui porte l'argumentaire et doit capter la recherche.
 * L'indexer revenait à mettre en concurrence deux URL sur le même titre.
 */
export const metadata: Metadata = {
  title: "Créer un compte — Nightflow Analytics",
  description:
    "Créez votre compte Nightflow Analytics. Gratuit, sans carte bancaire.",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <AuthCard mode="signup" />;
}
