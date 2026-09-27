"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrialGate } from "@/features/billing/trial-gate";
import { useAuth } from "@/hooks/use-auth";
import { usePlan } from "@/hooks/use-plan";
import { STORE_PLATFORMS, type StorePlatform } from "@/lib/signup";
import { track } from "@/lib/track";

/**
 * Three steps between "compte créé" and "première source connectée":
 * confirm the store (pre-filled from signup — a Google sign-in has nothing
 * yet), activate the 30 days (the trial is what unlocks connections), then
 * hand off to the connection page. The "analyse en cours" moment and the
 * first brief live on the dashboard, which is where the last step sends.
 */
const STEPS = [
  {
    title: "Ta boutique",
    subtitle: "Préremplie depuis ton inscription. Vérifie, puis continue.",
  },
  {
    title: "Tes 30 jours gratuits",
    subtitle: "Sans carte. C'est l'essai qui débloque la connexion de ta boutique.",
  },
  {
    title: "Connecte ta source",
    subtitle: "Cinq minutes avec une clé en lecture seule. Le premier brief suit les premières commandes importées.",
  },
];

type StoreField = "storeName" | "storeUrl" | "platform";

export default function OnboardingPage() {
  const router = useRouter();
  const { demoMode } = useAuth();
  const { plan, loading: planLoading, trialAvailable, reload: reloadPlan } = usePlan();
  const [step, setStep] = useState(0);
  const [store, setStore] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [platform, setPlatform] = useState<StorePlatform | "">("");
  const [storeError, setStoreError] = useState<{ field?: StoreField; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => track("onboarding_start", {}, { once: true }), []);

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

  // Already on a plan that connects (trial started from elsewhere, paid, or
  // trial already used): the trial step has nothing to offer, skip it.
  const trialStepNeeded = !demoMode && (planLoading || (!plan.integrations && trialAvailable));

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
      setStoreError({ message: "Connexion impossible. Vérifie ton réseau et réessaie." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 0) {
      if (!(await saveStore())) return;
      setStep(trialStepNeeded ? 1 : 2);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const lastStep = step === STEPS.length - 1;

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* progress */}
        <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-base ${
                i <= step ? "w-8 bg-accent" : "w-4 bg-line"
              }`}
            />
          ))}
        </div>

        <div className="panel p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[16px] bg-accent">
                  <Moon className="h-7 w-7 text-accent-ink" strokeWidth={2.2} aria-hidden />
                </span>
              )}

              <p className="text-center text-label text-ink3">
                Étape {step + 1} sur {STEPS.length}
              </p>
              <h1 className="mt-1 text-center text-title">{STEPS[step].title}</h1>
              <p className="mt-1.5 text-center text-label font-normal text-ink2">
                {STEPS[step].subtitle}
              </p>

              <div className="mt-6">
                {step === 0 && (
                  <div className="flex flex-col gap-4 text-left">
                    <Field
                      id="onb-store-name"
                      label="Nom de ta boutique"
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
                      hint="L'adresse où tes clients commandent (ex. maboutique.fr). C'est cette boutique que tes 30 jours couvrent."
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

                {step === 1 && (
                  <TrialGate
                    trialAvailable={trialAvailable}
                    loading={planLoading}
                    title="Active tes 30 jours gratuits"
                    message="Sans carte, sans engagement. L'essai s'arrête seul si tu ne fais rien."
                    onActivated={() => {
                      reloadPlan();
                      setStep(2);
                    }}
                  />
                )}

                {step === 2 && (
                  <div className="flex flex-col items-center gap-5 py-2">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-good text-accent-ink">
                      <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                    </span>
                    <ul className="w-full text-left text-label font-normal text-ink2">
                      {[
                        "Tu colles une clé en lecture seule — le guide est sur la page suivante.",
                        "Nightflow importe tes commandes et tes produits.",
                        "Ton premier brief apparaît sur l'accueil.",
                      ].map((t) => (
                        <li key={t} className="flex gap-2.5 py-1">
                          <Check className="mt-1 h-4 w-4 flex-none text-accent" strokeWidth={3} aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        track("onboarding_done", {}, { once: true });
                        router.push("/integrations?from=onboarding");
                      }}
                    >
                      Connecter ma boutique
                    </Button>
                  </div>
                )}
              </div>

              {step === 0 && (
                <Button size="lg" className="mt-7 w-full" onClick={next} loading={saving}>
                  {saving ? "Enregistrement…" : "Continuer"}
                </Button>
              )}

              {!lastStep && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-2 inline-flex min-h-tap w-full items-center justify-center text-label font-medium text-ink3 transition hover:text-ink"
                >
                  Plus tard
                </button>
              )}
              {lastStep && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-2 inline-flex min-h-tap w-full items-center justify-center text-label font-medium text-ink3 transition hover:text-ink"
                >
                  Voir l&apos;accueil d&apos;abord
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
