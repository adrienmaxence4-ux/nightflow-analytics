"use client";

import { useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { InstallApp } from "@/features/pwa/install-app";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.store) setStoreName(user.store);
  }, [user?.store]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName }),
      });
      const data = await res.json().catch(() => ({}));
      toast(
        res.ok ? "Profil enregistré" : data.error ?? "Échec de l'enregistrement",
        res.ok ? "success" : "info"
      );
    } catch {
      toast("Échec de l'enregistrement", "info");
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = "mb-2 block text-[17px] font-semibold text-ink2";

  return (
    <PageTransition>
      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {/* Votre profil */}
        <section className="panel p-7 min-[900px]:col-span-2">
          <h2 className="mb-6 font-display text-title">Votre profil</h2>
          <div className="flex flex-wrap items-center gap-5">
            <span className="grid h-[72px] w-[72px] place-items-center rounded-[16px] bg-accent font-display text-[26px] font-extrabold text-accent-ink">
              {user?.initials ?? "NF"}
            </span>
            <div>
              <div className="text-[20px] font-bold">{user?.name ?? "Compte"}</div>
              <div className="text-[17px] text-ink3">{user?.email}</div>
            </div>
          </div>
          <div className="mt-7 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <label className="block">
              <span className={fieldLabel}>Nom de la boutique</span>
              <Input
                className="min-h-[52px] text-[18px]"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="MoonStore"
              />
            </label>
            {[
              ["Fuseau horaire", "Europe/Paris (GMT+1)"],
              ["Devise", "EUR (€)"],
              ["Langue", "Français"],
            ].map(([l, v]) => (
              <label key={l} className="block">
                <span className={fieldLabel}>{l}</span>
                <Input className="min-h-[52px] text-[18px]" defaultValue={v} />
              </label>
            ))}
          </div>
          <Button size="lg" className="mt-7" onClick={saveProfile} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </section>

        {/* Affichage */}
        <section className="panel p-7">
          <h2 className="font-display text-title">Affichage</h2>
          <p className="mb-5 mt-2 text-[17px] leading-relaxed text-ink2">
            Choisissez le mode qui fatigue le moins vos yeux.
          </p>
          <ThemeToggle variant="inline" />
        </section>

        {/* Installer l'application */}
        <InstallApp />

        {/* Vos données */}
        <section className="panel p-7 min-[900px]:col-span-2">
          <h2 className="font-display text-title">Vos données</h2>
          <p className="mb-4 mt-2 text-[17px] leading-relaxed text-ink2">
            Vos données sont isolées par compte, chiffrées au repos et jamais
            revendues.
          </p>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-[17px]">
            <a href="/confidentialite" target="_blank" className="text-accent-text underline underline-offset-2 hover:text-ink">
              Politique de confidentialité
            </a>
            <a href="/conditions" target="_blank" className="text-accent-text underline underline-offset-2 hover:text-ink">
              Conditions d&apos;utilisation
            </a>
            <a href="/mentions-legales" target="_blank" className="text-accent-text underline underline-offset-2 hover:text-ink">
              Mentions légales
            </a>
            <a href="mailto:adrienmaxence4@gmail.com" className="text-accent-text underline underline-offset-2 hover:text-ink">
              Contacter le support
            </a>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
