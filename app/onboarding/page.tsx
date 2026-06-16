"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  {
    title: "Bienvenue sur Nightflow 🌙",
    subtitle: "Votre copilote IA pour piloter votre e-commerce.",
  },
  {
    title: "Parlez-nous de votre boutique",
    subtitle: "Cela aide le Copilot à personnaliser ses insights.",
  },
  {
    title: "Connectez vos sources de données",
    subtitle: "Vous pourrez en ajouter d'autres plus tard.",
  },
  {
    title: "Tout est prêt ✨",
    subtitle: "Votre directeur e-commerce IA vous attend.",
  },
];

const SOURCES = [
  { id: "shopify", name: "Shopify", logo: "🛍" },
  { id: "ga4", name: "Google Analytics", logo: "📈" },
  { id: "meta", name: "Meta Ads", logo: "📘" },
  { id: "tiktok", name: "TikTok Ads", logo: "🎵" },
  { id: "stripe", name: "Stripe", logo: "💳" },
  { id: "klaviyo", name: "Klaviyo", logo: "✉️" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [store, setStore] = useState("");
  const [selected, setSelected] = useState<string[]>(["shopify"]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      toast("Configuration terminée — bienvenue ! 🚀");
      router.push("/dashboard");
    }
  };

  const toggleSource = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-neon-cyan shadow-glow" : "w-4 bg-glass-border"
              }`}
            />
          ))}
        </div>

        <div className="glass-card p-8">
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
                  <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
                    <Moon className="h-7 w-7 text-white" strokeWidth={2.2} />
                  </span>
                </div>
              )}

              <h1 className="text-center text-[22px] font-extrabold">
                {STEPS[step].title}
              </h1>
              <p className="mt-1.5 text-center text-[13px] text-ink-dim">
                {STEPS[step].subtitle}
              </p>

              <div className="mt-6">
                {step === 0 && (
                  <p className="rounded-xl border border-glass-border bg-glass-2 p-4 text-center text-[13px] leading-relaxed text-ink-dim">
                    Nightflow ne vous montre pas seulement des chiffres. Il vous dit{" "}
                    <b className="text-white">ce qui se passe</b>,{" "}
                    <b className="text-white">pourquoi</b>, et{" "}
                    <b className="text-white">quoi faire</b> — en moins de 30
                    secondes.
                  </p>
                )}

                {step === 1 && (
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-ink-mut">
                      Nom de votre boutique
                    </span>
                    <Input
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                      placeholder="Ex. Nightflow Studio"
                    />
                  </label>
                )}

                {step === 2 && (
                  <div className="grid grid-cols-2 gap-3">
                    {SOURCES.map((s) => {
                      const on = selected.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSource(s.id)}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                            on
                              ? "border-neon-cyan bg-neon-cyan/10 shadow-glow"
                              : "border-glass-border bg-glass-2 hover:border-glass-hi"
                          }`}
                        >
                          <span className="text-xl">{s.logo}</span>
                          <span className="flex-1 text-[13px] font-semibold">
                            {s.name}
                          </span>
                          {on && (
                            <Check className="h-4 w-4 text-neon-cyan" strokeWidth={3} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-neon-lime to-emerald-400 text-night-950">
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </span>
                    <p className="text-center text-[13px] text-ink-dim">
                      {selected.length} source{selected.length > 1 ? "s" : ""}{" "}
                      sélectionnée{selected.length > 1 ? "s" : ""}. Vous pourrez
                      tout configurer depuis les Paramètres.
                    </p>
                  </div>
                )}
              </div>

              <Button size="lg" className="mt-7 w-full" onClick={next}>
                {step === STEPS.length - 1
                  ? "Accéder au dashboard"
                  : "Continuer"}
              </Button>

              {step < STEPS.length - 1 && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-3 w-full text-center text-[12px] text-ink-mut transition hover:text-white"
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
