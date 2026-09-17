"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { STORE_PLATFORMS, type StorePlatform } from "@/lib/signup";

const STEPS = [
  {
    title: "Bienvenue sur Nightflow 🌙",
    subtitle: "Votre copilote IA pour piloter votre e-commerce.",
  },
  {
    title: "Parlez-nous de votre boutique",
    subtitle: "Le Copilot s'en sert pour ses analyses.",
  },
  {
    title: "Quels outils utilisez-vous ?",
    subtitle: "Rien n'est connecté ici : la connexion se fait à l'étape suivante.",
  },
  {
    title: "Tout est prêt ✨",
    subtitle: "Il reste à connecter votre boutique : c'est elle qui remplit le dashboard.",
  },
];

// Meta Ads and TikTok Ads are left out while their platform reviews are
// pending: naming them here would promise a connection the next screen refuses.
const SOURCES = [
  { id: "shopify", name: "Shopify", logo: "🛍" },
  { id: "ga4", name: "Google Analytics", logo: "📈" },
  { id: "stripe", name: "Stripe", logo: "💳" },
  { id: "klaviyo", name: "Klaviyo", logo: "✉️" },
];

type StoreField = "storeName" | "storeUrl" | "platform";

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { demoMode } = useAuth();
  const [step, setStep] = useState(0);
  const [store, setStore] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [platform, setPlatform] = useState<StorePlatform | "">("");
  const [storeError, setStoreError] = useState<{ field?: StoreField; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>(["shopify"]);

  // A detailed signup already created the store: show it rather than an empty form.
  useEffect(() => {
    if (demoMode) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { storeName?: string; storeUrl?: string; platform?: string } | null) => {
        if (!d) return;
        setStore(d.storeName ?? "");
        setStoreUrl(d.storeUrl ?? "");
        if (STORE_PLATFORMS.some((p) => p.id === d.platform)) setPlatform(d.platform as StorePlatform);
      })
      .catch(() => {});
  }, [demoMode]);

  const saveStore = async (): Promise<boolean> => {
    if (demoMode) return true;
    setSaving(true);
    setStoreError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: store, storeUrl, platform }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: StoreField };
      if (!res.ok) {
        setStoreError({ field: data.field, message: data.error ?? "Enregistrement impossible." });
        return false;
      }
      return true;
    } catch {
      setStoreError({ message: "Connexion impossible. Vérifiez votre réseau et réessayez." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 1 && !(await saveStore())) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      toast("Configuration terminée — bienvenue ! 🚀");
      router.push("/dashboard");
    }
  };

  const toggleSource = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const lastStep = step === STEPS.length - 1;

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-accent " : "w-4 bg-line"
              }`}
            />
          ))}
        </div>

        <div className="panel p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && (
                <div className="text-center">
                  <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[16px]  bg-accent">
                    <Moon className="h-7 w-7 text-accent-ink" strokeWidth={2.2} aria-hidden />
                  </span>
                </div>
              )}

              <h1 className="text-center text-title">
                {STEPS[step].title}
              </h1>
              <p className="mt-1.5 text-center text-label font-normal text-ink2">
                {STEPS[step].subtitle}
              </p>

              <div className="mt-6">
                {step === 0 && (
                  <p className="rounded-xl border border-line bg-panel2 p-4 text-center text-label font-normal leading-relaxed text-ink2">
                    Nightflow ne vous montre pas seulement des chiffres. Il vous dit{" "}
                    <b className="text-ink">ce qui se passe</b>,{" "}
                    <b className="text-ink">pourquoi</b>, et{" "}
                    <b className="text-ink">quoi faire</b> — en moins de 30
                    secondes.
                  </p>
                )}

                {step === 1 && (
                  <div className="flex flex-col gap-4 text-left">
                    <Field
                      id="onb-store-name"
                      label="Nom de votre boutique"
                      error={storeError?.field === "storeName" ? storeError.message : null}
                    >
                      <Input
                        value={store}
                        onChange={(e) => setStore(e.target.value)}
                        placeholder="Ex. Maison Durand"
                        autoComplete="organization"
                        disabled={saving}
                      />
                    </Field>
                    <Field
                      id="onb-store-url"
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
                      id="onb-store-platform"
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
                    {storeError && !storeError.field && (
                      <p role="alert" className="text-label font-medium text-bad">
                        {storeError.message}
                      </p>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    {SOURCES.map((s) => {
                      const on = selected.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleSource(s.id)}
                          className={`flex min-h-tap items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                            on
                              ? "border-accent bg-panel2 "
                              : "border-line bg-panel2 hover:border-line"
                          }`}
                        >
                          <span className="text-xl" aria-hidden>{s.logo}</span>
                          <span className="flex-1 text-label">
                            {s.name}
                          </span>
                          {on && (
                            <Check className="h-4 w-4 text-accent-text" strokeWidth={3} aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col items-center gap-5 py-2">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-good text-accent-ink">
                      <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                    </span>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => router.push("/integrations")}
                    >
                      Connecter ma boutique
                    </Button>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                variant={lastStep ? "ghost" : "primary"}
                className={lastStep ? "mt-3 w-full" : "mt-7 w-full"}
                onClick={next}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : lastStep ? "Accéder au dashboard" : "Continuer"}
              </Button>

              {step < STEPS.length - 1 && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-2 inline-flex min-h-tap w-full items-center justify-center text-label font-medium text-ink3 transition hover:text-ink"
                >
                  Passer pour l&apos;instant
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
