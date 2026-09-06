import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

/**
 * `noindex` volontaire : une page de connexion n'a aucune intention de
 * recherche derrière elle, et sans métadonnées propres elle héritait mot pour
 * mot du titre de l'accueil — trois URL indexables pour un seul titre.
 * `follow` reste actif : les liens vers les pages légales gardent leur valeur.
 */
export const metadata: Metadata = {
  title: "Connexion — Nightflow Analytics",
  description: "Connectez-vous à votre espace Nightflow Analytics.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <AuthCard mode="login" />;
}
