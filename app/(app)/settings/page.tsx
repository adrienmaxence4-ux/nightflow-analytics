"use client";

import { useEffect, useState } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { InstallApp } from "@/features/pwa/install-app";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { STORE_PLATFORMS, type StorePlatform } from "@/lib/signup";

type StoreField = "storeName" | "storeUrl" | "platform";

export default function SettingsPage() {
  const toast = useToast();
  const { user, demoMode, updatePassword, signOutEverywhere } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [platform, setPlatform] = useState<StorePlatform | "">("");
  const [storeError, setStoreError] = useState<{ field?: StoreField; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [outBusy, setOutBusy] = useState(false);

  const changePassword = async () => {
    if (pwBusy) return;
    if (pw !== pw2) {
      toast("Les deux mots de passe ne correspondent pas.", "info");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await updatePassword(pw);
      if (error) {
        toast(error, "info");
        return;
      }
      setPw("");
      setPw2("");
      toast("Mot de passe changé — les autres appareils ont été déconnectés.", "success");
    } finally {
      setPwBusy(false);
    }
  };

  const disconnectEverywhere = async () => {
    if (outBusy) return;
    setOutBusy(true);
    try {
      const { error } = await signOutEverywhere();
      if (error) toast(error, "info");
      else window.location.href = "/login";
    } finally {
      setOutBusy(false);
    }
  };

  useEffect(() => {
    if (demoMode) {
      if (user?.store) setStoreName(user.store);
      return;
    }
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { storeName?: string; storeUrl?: string; platform?: string } | null) => {
        if (!d) return;
        setStoreName(d.storeName ?? "");
        setStoreUrl(d.storeUrl ?? "");
        if (STORE_PLATFORMS.some((p) => p.id === d.platform)) setPlatform(d.platform as StorePlatform);
      })
      .catch(() => {});
  }, [demoMode, user?.store]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    setStoreError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, storeUrl, platform }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: StoreField };
      if (res.ok) {
        toast("Boutique enregistrée", "success");
      } else {
        setStoreError({ field: data.field, message: data.error ?? "Échec de l'enregistrement" });
      }
    } catch {
      setStoreError({ message: "Connexion impossible. Vérifiez votre réseau et réessayez." });
    } finally {
      setSaving(false);
    }
  };

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
            <Field
              id="store-name"
              label="Nom de la boutique"
              error={storeError?.field === "storeName" ? storeError.message : null}
            >
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Maison Durand"
                autoComplete="organization"
                disabled={saving}
              />
            </Field>
            <Field
              id="store-url"
              label="Adresse de la boutique"
              hint="L'adresse où vos clients commandent (ex. maboutique.fr). C'est cette boutique que vos 30 jours de Pro couvrent."
              error={storeError?.field === "storeUrl" ? storeError.message : null}
            >
              <Input
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="maboutique.fr"
                inputMode="url"
                autoComplete="url"
                disabled={saving}
              />
            </Field>
            <Field
              id="store-platform"
              label="Plateforme"
              error={storeError?.field === "platform" ? storeError.message : null}
            >
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as StorePlatform | "")}
                placeholder="Choisir"
                disabled={saving}
              >
                {STORE_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            {/* Préréglages non modifiables pour l'instant : affichés, pas éditables. */}
            {[
              ["timezone", "Fuseau horaire", "Europe/Paris (GMT+1)"],
              ["currency", "Devise", "EUR (€)"],
              ["locale", "Langue", "Français"],
            ].map(([id, l, v]) => (
              <Field key={id} id={`preset-${id}`} label={l}>
                <Input value={v} readOnly aria-readonly className="text-ink2" />
              </Field>
            ))}
          </div>
          {storeError && !storeError.field && (
            <p role="alert" className="mt-4 text-label font-medium text-bad">
              {storeError.message}
            </p>
          )}
          <Button size="lg" className="mt-7" onClick={saveProfile} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </section>

        {/* Sécurité */}
        <section className="panel p-7 min-[900px]:col-span-2">
          <h2 className="mb-1 font-display text-title">Sécurité</h2>
          <p className="mb-5 mt-1 text-[16px] leading-relaxed text-ink3">
            Changer le mot de passe déconnecte automatiquement les autres
            appareils.
          </p>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <Field id="new-pw" label="Nouveau mot de passe">
              <Input
                type="password"
                value={pw}
                minLength={10}
                autoComplete="new-password"
                placeholder="10 caractères minimum"
                onChange={(e) => setPw(e.target.value)}
              />
            </Field>
            <Field id="new-pw2" label="Confirmer">
              <Input
                type="password"
                value={pw2}
                minLength={10}
                autoComplete="new-password"
                placeholder="Confirmez le mot de passe"
                onChange={(e) => setPw2(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={changePassword}
              disabled={pwBusy || pw.length < 10 || pw2.length < 10}
            >
              {pwBusy ? "…" : "Changer le mot de passe"}
            </Button>
            <Button variant="ghost" onClick={disconnectEverywhere} disabled={outBusy}>
              {outBusy ? "…" : "Déconnecter tous les appareils"}
            </Button>
          </div>
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
