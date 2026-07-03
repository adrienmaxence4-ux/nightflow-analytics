import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Moon,
  Radar,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import { PLAN_LIST, formatEuro } from "@/lib/plans";

/**
 * Public landing page — the front door for visitors who aren't logged in yet.
 * Static (fast + SEO). Signed-in users just click "Ouvrir le dashboard".
 */
export default function LandingPage() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5">
      {/* ── Nav ── */}
      <header className="flex items-center gap-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 flex-none place-items-center rounded-xl shadow-glow [background:conic-gradient(from_140deg,#3df2ff,#9a6bff,#ff5cae,#3df2ff)]">
            <span className="absolute inset-[3px] rounded-[9px] bg-night-900" />
            <Moon className="relative z-10 h-4 w-4 text-white" strokeWidth={2.4} />
          </span>
          <span className="text-[14px] font-extrabold tracking-wide">
            NIGHTFLOW <span className="text-neon-cyansoft">ANALYTICS</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-[13px] font-semibold text-ink-dim sm:flex">
          <a href="#fonctionnalites" className="hover:text-white">Fonctionnalités</a>
          <a href="#tarifs" className="hover:text-white">Tarifs</a>
          <Link href="/login" className="hover:text-white">Se connecter</Link>
        </nav>
        <Link
          href="/signup"
          className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-4 py-2 text-[13px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          Commencer gratuitement
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-glass-hi bg-glass px-3 py-1 text-[11px] font-bold tracking-wide text-neon-cyansoft">
            <Sparkles className="h-3 w-3" /> VOTRE DIRECTEUR E-COMMERCE IA
          </span>
          <h1 className="mt-4 text-[38px] font-extrabold leading-[1.1] tracking-tight sm:text-[48px]">
            Arrêtez de fixer des chiffres.{" "}
            <span className="bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink bg-clip-text text-transparent">
              Sachez quoi faire.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-ink-dim">
            Nightflow connecte votre boutique et vous dit en français clair{" "}
            <b className="text-white">ce qui se passe</b>,{" "}
            <b className="text-white">pourquoi</b>, et{" "}
            <b className="text-white">quoi faire</b> — en moins de 30 secondes
            par jour.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-6 py-3 text-[15px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
            >
              Essayer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-glass-border bg-glass px-5 py-3 text-[14px] font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
            >
              Voir la démo
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-ink-mut">
            Sans carte bancaire · Connexion boutique en 1 clic · Données
            chiffrées, jamais revendues
          </p>
        </div>

        {/* Product taste: a real insight, as the app renders it */}
        <div className="rounded-2xl border border-glass-hi bg-night-900/70 p-5 shadow-[0_24px_80px_-24px_rgba(61,242,255,0.25)] backdrop-blur-xl">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              ["Revenu (7j)", "€4 820", "+12,4 %", "text-neon-lime"],
              ["Commandes", "142", "+8,1 %", "text-neon-lime"],
              ["Conversion", "2,1 %", "−14 %", "text-neon-pinksoft"],
            ].map(([l, v, d, tone]) => (
              <div key={l} className="rounded-xl border border-glass-border bg-glass p-3">
                <div className="text-[10px] font-semibold text-ink-mut">{l}</div>
                <div className="mt-1 text-[18px] font-extrabold">{v}</div>
                <div className={`text-[11px] font-bold ${tone}`}>{d}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/5 p-4">
            <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wide text-neon-pinksoft">
              <AlertTriangle className="h-3.5 w-3.5" /> RISQUE DÉTECTÉ
            </div>
            <p className="mt-2 text-[13px] font-bold leading-snug">
              Votre best-seller sera en rupture dans ~4 jours (25 unités, ~5,8
              ventes/jour).
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-dim">
              → Passez une commande de réassort d&apos;urgence (min. 60 unités)
              — ≈ €1 600/sem de CA en jeu.
            </p>
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-mut">
            Exemple réel d&apos;analyse générée par le Copilot
          </p>
        </div>
      </section>

      {/* ── Compatible tools ── */}
      <section className="border-y border-glass-border py-6 text-center">
        <p className="text-[11px] font-bold tracking-[2px] text-ink-mut">
          SE CONNECTE EN 1 CLIC À
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] font-bold text-ink-dim">
          {["Shopify", "Wix", "WooCommerce", "Stripe", "Klaviyo", "Google Analytics"].map(
            (t) => (
              <span key={t} className="hover:text-white">{t}</span>
            )
          )}
        </div>
      </section>

      {/* ── The 3 pillars ── */}
      <section id="fonctionnalites" className="py-16">
        <h2 className="text-center text-[28px] font-extrabold tracking-tight">
          Un copilote, pas un tableau de plus
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[14px] text-ink-dim">
          Les dashboards classiques vous montrent des courbes. Nightflow les
          lit à votre place et répond aux trois seules questions qui comptent :
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              n: "1",
              t: "Que se passe-t-il ?",
              d: "« Le CA a chuté de 26 % cette semaine. » Vos KPIs traduits en phrases claires, pas en graphiques à déchiffrer.",
            },
            {
              n: "2",
              t: "Pourquoi ?",
              d: "« Le trafic tient, mais la conversion mobile s'effondre depuis mardi. » L'IA croise vos données pour trouver la cause.",
            },
            {
              n: "3",
              t: "Que dois-je faire ?",
              d: "« Réallouez €300 de Meta vers Google Ads (ROAS 4,3 vs 2,7). » Des actions concrètes, chiffrées, priorisées.",
            },
          ].map((p) => (
            <div key={p.n} className="rounded-2xl border border-glass-border bg-glass p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan/25 to-neon-violet/25 text-[16px] font-extrabold text-neon-cyansoft">
                {p.n}
              </span>
              <h3 className="mt-4 text-[17px] font-extrabold">{p.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{p.d}</p>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [BellRing, "Alertes en temps réel", "Rupture de stock, chute de CA, pub qui perd de l'argent — prévenu avant que ça coûte cher, même sur votre téléphone."],
            [Radar, "Détection d'anomalies", "Un moteur surveille vos métriques 24h/24 et repère les décrochages anormaux automatiquement."],
            [FileText, "Rapports PDF, Excel & Word", "Un rapport pro généré en 1 clic à partir de vos vraies données — prêt à envoyer à un associé ou un banquier."],
            [Store, "Multi-plateformes", "Shopify, Wix, WooCommerce, Stripe, Klaviyo, GA4 — toutes vos données dans un seul cerveau."],
            [Sparkles, "Copilot IA", "Posez n'importe quelle question sur votre boutique et obtenez une réponse chiffrée, basée sur VOS données."],
            [Smartphone, "App desktop & mobile", "Installez Nightflow comme une vraie application, avec notifications sur PC et téléphone."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof BellRing;
            return (
              <div key={t as string} className="rounded-2xl border border-glass-border bg-glass-2 p-5">
                <I className="h-5 w-5 text-neon-cyansoft" />
                <h3 className="mt-3 text-[14px] font-bold">{t as string}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-dim">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="tarifs" className="py-14">
        <h2 className="text-center text-[28px] font-extrabold tracking-tight">
          Tarifs simples, sans surprise
        </h2>
        <p className="mt-2 text-center text-[14px] text-ink-dim">
          Commencez gratuitement. Passez au niveau supérieur quand votre
          boutique le mérite.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-glass-hi shadow-glow [background:linear-gradient(160deg,rgba(154,107,255,0.18),rgba(61,242,255,0.06))]"
                  : "border-glass-border bg-glass"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-extrabold">{plan.name}</h3>
                <span className="rounded-full bg-neon-violet/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-violet">
                  {plan.tag}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-[32px] font-extrabold tracking-tight">
                  {formatEuro(plan.monthlyCents)}
                </span>
                <span className="mb-1.5 text-sm text-ink-dim">/mois</span>
              </div>
              <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-ink-dim">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-neon-cyan" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 rounded-xl py-2.5 text-center text-sm font-bold transition ${
                  plan.highlight
                    ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110"
                    : "border border-glass-border bg-glass text-ink-dim hover:border-glass-hi hover:text-white"
                }`}
              >
                {plan.id === "free" ? "Essayer la démo" : `Choisir ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-2xl py-12">
        <h2 className="text-center text-[24px] font-extrabold tracking-tight">
          Questions fréquentes
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {[
            ["Est-ce compliqué à installer ?", "Non : créez un compte, cliquez « Se connecter avec Shopify/Stripe/… » et autorisez l'accès. Aucune ligne de code, aucune clé à créer pour les connexions OAuth. Vos données arrivent en quelques secondes."],
            ["Mes données sont-elles en sécurité ?", "Oui. Chaque compte est isolé au niveau de la base (RLS), les jetons d'accès sont chiffrés (AES-256), et nous n'importons jamais les données personnelles de vos clients — uniquement des métriques. Rien n'est revendu."],
            ["L'IA invente-t-elle des chiffres ?", "Non. Le Copilot raisonne uniquement sur vos données réelles importées, et le moteur d'alertes est déterministe : chaque alerte cite les chiffres exacts qui l'ont déclenchée."],
            ["Puis-je annuler à tout moment ?", "Oui, en 2 clics depuis la page Facturation (portail Stripe sécurisé). Vous gardez l'accès jusqu'à la fin de la période payée."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-glass-border bg-glass p-4">
              <summary className="cursor-pointer list-none text-[14px] font-bold marker:hidden">
                {q}
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="my-10 rounded-3xl border border-glass-hi p-10 text-center [background:linear-gradient(140deg,rgba(154,107,255,0.2),rgba(61,242,255,0.08))]">
        <h2 className="text-[26px] font-extrabold tracking-tight">
          Votre boutique a des choses à vous dire.
        </h2>
        <p className="mt-2 text-[14px] text-ink-dim">
          Connectez-la en 1 clic et laissez le Copilot faire le premier rapport.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-7 py-3 text-[15px] font-bold text-night-950 shadow-glow transition hover:brightness-110"
        >
          Commencer gratuitement <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-glass-border py-8 text-[12px] text-ink-mut">
        <span>© {new Date().getFullYear()} Nightflow Analytics</span>
        <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
        <Link href="/conditions" className="hover:text-white">Conditions</Link>
        <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
        <a href="mailto:adrienmaxence4@gmail.com" className="ml-auto hover:text-white">
          Contact
        </a>
      </footer>
    </div>
  );
}
