import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Moon,
  Radar,
  Smartphone,
  Sparkles,
  Store,
  TriangleAlert,
} from "lucide-react";
import { PLAN_LIST, formatEuro } from "@/lib/plans";
import { LandingThemeToggle } from "@/components/landing/theme-toggle-landing";

/** Applique la préférence clair/sombre de la landing avant le premier rendu. */
const LANDING_THEME_SCRIPT = `try{if(localStorage.getItem('nightflow:landing-theme')==='clair'){document.getElementById('landing-root').setAttribute('data-theme','clair')}}catch(e){}`;

/**
 * Landing publique — la porte d'entrée des visiteurs non connectés.
 * Toujours en mode sombre : le conteneur racine force `data-theme="sombre"`,
 * qui redéclare les variables de thème pour toute la page, quel que soit le
 * thème global de l'utilisateur.
 *
 * Server Component : statique, rapide, indexable.
 */

const CONNECTORS = ["Shopify", "Wix", "WooCommerce", "Stripe", "Klaviyo", "Google Analytics"];

const STEPS = [
  {
    n: "1",
    t: "Créez votre compte",
    d: "Gratuit, sans carte bancaire. Vous explorez d'abord avec une boutique de démonstration complète.",
  },
  {
    n: "2",
    t: "Connectez votre boutique",
    d: "Un clic sur « Se connecter avec Shopify, Wix, WooCommerce ou Stripe » — vos produits, commandes et revenus arrivent en quelques secondes.",
  },
  {
    n: "3",
    t: "Laissez le copilote veiller",
    d: "Analyses, alertes et rapports arrivent tout seuls — sur le site, sur votre ordinateur et sur votre téléphone.",
  },
];

const PILLARS = [
  {
    t: "Que se passe-t-il ?",
    d: "« Le CA a chuté de 26 % cette semaine. » Vos KPIs traduits en phrases claires, pas en graphiques à déchiffrer.",
  },
  {
    t: "Pourquoi ?",
    d: "« Le trafic tient, mais la conversion mobile s'effondre depuis mardi. » L'IA croise vos données pour trouver la cause.",
  },
  {
    t: "Que dois-je faire ?",
    d: "« Réallouez €300 de Meta vers Google Ads (ROAS 4,3 vs 2,7). » Des actions concrètes, chiffrées, priorisées.",
  },
];

const FEATURES: [typeof BellRing, string, string][] = [
  [BellRing, "Alertes en temps réel", "Rupture de stock, chute de CA, pub qui perd de l'argent — prévenu avant que ça coûte cher, même sur votre téléphone."],
  [Radar, "Détection d'anomalies", "Un moteur surveille vos métriques 24h/24 et repère les décrochages anormaux automatiquement."],
  [FileText, "Rapports PDF, Excel & Word", "Un rapport pro généré en 1 clic à partir de vos vraies données — prêt à envoyer à un associé ou un banquier."],
  [Store, "Multi-plateformes", "Shopify, Wix, WooCommerce, Stripe, Klaviyo, GA4 — toutes vos données dans un seul cerveau."],
  [Sparkles, "Copilot IA", "Posez n'importe quelle question sur votre boutique et obtenez une réponse chiffrée, basée sur VOS données."],
  [Smartphone, "App desktop & mobile", "Installez Nightflow comme une vraie application, avec notifications sur PC et téléphone."],
];

const FAQ: [string, string][] = [
  ["Est-ce compliqué à installer ?", "Non : créez un compte, cliquez « Se connecter avec Shopify/Stripe/… » et autorisez l'accès. Aucune ligne de code, aucune clé à créer pour les connexions OAuth. Vos données arrivent en quelques secondes."],
  ["Mes données sont-elles en sécurité ?", "Oui. Chaque compte est isolé au niveau de la base (RLS), les jetons d'accès sont chiffrés (AES-256), et nous n'importons jamais les données personnelles de vos clients — uniquement des métriques. Rien n'est revendu."],
  ["L'IA invente-t-elle des chiffres ?", "Non. Le Copilot raisonne uniquement sur vos données réelles importées, et le moteur d'alertes est déterministe : chaque alerte cite les chiffres exacts qui l'ont déclenchée."],
  ["Puis-je annuler à tout moment ?", "Oui, en 2 clics depuis la page Facturation (portail Stripe sécurisé). Vous gardez l'accès jusqu'à la fin de la période payée."],
];

export default function LandingPage() {
  return (
    <div
      id="landing-root"
      data-theme="sombre"
      className="min-h-screen text-ink [background:linear-gradient(180deg,#0d1219,#08090c_55%)] data-[theme=clair]:[background:linear-gradient(180deg,var(--panel),var(--bg)_55%)]"
    >
      <script dangerouslySetInnerHTML={{ __html: LANDING_THEME_SCRIPT }} />
      <div className="mx-auto w-full max-w-[1160px] px-6">
        {/* ── Nav ── */}
        <header className="flex flex-wrap items-center gap-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] bg-accent">
              <Moon className="h-[22px] w-[22px] text-accent-ink" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="font-display text-[19px] font-extrabold tracking-[0.02em]">
              NIGHTFLOW <span className="font-semibold text-ink3">ANALYTICS</span>
            </span>
          </Link>
          <nav className="ml-auto flex flex-wrap items-center gap-6 text-[17px] font-semibold">
            <a href="#fonctionnalites" className="text-ink hover:text-accent-text">Ce que ça fait</a>
            <a href="#tarifs" className="text-ink hover:text-accent-text">Tarifs</a>
            <a href="#questions" className="text-ink hover:text-accent-text">Questions</a>
            <LandingThemeToggle />
            <Link
              href="/login"
              className="inline-flex min-h-tap items-center rounded-[12px] border border-cool px-5 text-[17px] font-semibold text-ink transition hover:border-accent"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-tap items-center rounded-[12px] bg-accent px-6 text-[17px] font-bold text-accent-ink transition hover:brightness-95"
            >
              Commencer gratuitement
            </Link>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="grid items-center gap-14 py-16 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))]">
          <div>
            <span className="fade-up inline-flex items-center gap-2 rounded-pill border border-cool px-4 py-2 text-[15px] font-bold tracking-[0.04em] text-accent-text">
              <Sparkles className="h-4 w-4" aria-hidden /> VOTRE DIRECTEUR E-COMMERCE IA
            </span>
            <h1 className="fade-up-1 mt-6 font-display text-[clamp(38px,8vw,60px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
              Arrêtez de fixer des chiffres.{" "}
              <span className="text-accent">Sachez quoi faire.</span>
            </h1>
            <p className="fade-up-2 mt-6 max-w-[36ch] text-[21px] leading-relaxed text-ink2">
              Nightflow connecte votre boutique et vous dit en français clair{" "}
              <b className="text-ink">ce qui se passe</b>,{" "}
              <b className="text-ink">pourquoi</b>, et{" "}
              <b className="text-ink">quoi faire</b> — en moins de 30 secondes par jour.
            </p>
            <div className="fade-up-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex min-h-[56px] items-center gap-2.5 rounded-[12px] bg-accent px-7 text-[19px] font-bold text-accent-ink transition hover:brightness-95"
              >
                Essayer gratuitement <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[56px] items-center rounded-[12px] border border-cool px-6 text-[19px] font-semibold text-ink transition hover:border-accent"
              >
                Voir la démo
              </Link>
            </div>
            <ul className="fade-up-3 mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[16px] text-ink3">
              {["Gratuit, sans carte bancaire", "Prêt en 2 minutes", "Données chiffrées, jamais revendues"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="h-[18px] w-[18px] flex-none text-accent" strokeWidth={3} aria-hidden />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Aperçu produit : une vraie analyse, telle que l'app la rend. */}
          <div className="fade-up-2 rounded-xl border border-line bg-panel p-6">
            <div className="mb-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
              {[
                ["Revenu (7j)", "€4 820", "+12,4 %", "text-good"],
                ["Commandes", "142", "+8,1 %", "text-good"],
                ["Conversion", "2,1 %", "−14 %", "text-bad"],
              ].map(([l, v, d, tone]) => (
                <div key={l} className="rounded-[12px] border border-line bg-panel2 p-4">
                  <div className="whitespace-nowrap text-[14px] font-semibold text-ink3">{l}</div>
                  <div className="mt-1.5 whitespace-nowrap font-display text-[26px] font-extrabold" data-numeric>
                    {v}
                  </div>
                  <div className={`whitespace-nowrap text-[15px] font-bold ${tone}`}>{d}</div>
                </div>
              ))}
            </div>
            <div className="rounded-[14px] border border-warn/30 bg-warn-bg p-5">
              <div className="flex items-center gap-2 text-[15px] font-extrabold tracking-[0.06em] text-accent-text">
                <TriangleAlert className="h-[18px] w-[18px]" aria-hidden /> RISQUE DÉTECTÉ
              </div>
              <p className="mt-3 text-[19px] font-bold leading-snug">
                Votre best-seller sera en rupture dans ~4 jours (25 unités, ~5,8 ventes/jour).
              </p>
              <p className="mt-2.5 text-[17px] leading-relaxed text-ink2">
                → Passez une commande de réassort d&apos;urgence (min. 60 unités) — ≈ €1 600/sem de CA en jeu.
              </p>
            </div>
            <p className="mt-3.5 text-center text-[15px] text-ink3">
              Exemple réel d&apos;analyse générée par le Copilot
            </p>
          </div>
        </section>

        {/* ── Connecteurs ── */}
        <section className="border-y border-line py-7 text-center">
          <p className="text-[15px] font-bold tracking-[0.14em] text-ink3">SE CONNECTE EN 1 CLIC À</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[19px] font-bold text-ink2">
            {CONNECTORS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── 3 étapes ── */}
        <section className="py-[72px]">
          <h2 className="text-center font-display text-[40px] font-extrabold tracking-[-0.02em]">
            Lancé en 2 minutes, sans rien installer
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-center text-[19px] text-ink3">
            Pas de code, pas de configuration, pas de tableur à remplir.
          </p>
          <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-line bg-panel p-8">
                <span className="grid h-[52px] w-[52px] place-items-center rounded-pill bg-accent font-display text-[24px] font-extrabold text-accent-ink">
                  {s.n}
                </span>
                <h3 className="mt-5 text-[22px] font-bold">{s.t}</h3>
                <p className="mt-2.5 text-[17px] leading-relaxed text-ink2">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3 piliers + 6 fonctionnalités ── */}
        <section id="fonctionnalites" className="border-t border-line py-[72px]">
          <h2 className="text-center font-display text-[40px] font-extrabold tracking-[-0.02em]">
            Un copilote, pas un tableau de plus
          </h2>
          <p className="mx-auto mt-3 max-w-[56ch] text-center text-[19px] leading-relaxed text-ink3">
            Les dashboards classiques vous montrent des courbes. Nightflow les lit à votre place et
            répond aux trois seules questions qui comptent :
          </p>
          <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {PILLARS.map((p) => (
              <div key={p.t} className="rounded-lg border border-line bg-panel p-8">
                <h3 className="font-display text-[24px] font-extrabold text-accent">{p.t}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-ink2">{p.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {FEATURES.map(([Icon, t, d]) => (
              <div key={t} className="rounded-lg border border-line bg-panel2 p-6">
                <Icon className="h-6 w-6 text-accent-text" strokeWidth={2} aria-hidden />
                <h3 className="mt-3.5 text-[19px] font-bold">{t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-ink3">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tarifs ── */}
        <section id="tarifs" className="border-t border-line py-[72px]">
          <h2 className="text-center font-display text-[40px] font-extrabold tracking-[-0.02em]">
            Tarifs simples, sans surprise
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-center text-[19px] text-ink3">
            Commencez gratuitement. Passez au niveau supérieur quand votre boutique le mérite.
          </p>
          <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {PLAN_LIST.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-lg border border-line bg-panel p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-[24px] font-extrabold">{plan.name}</h3>
                  <span className="rounded-pill border border-cool px-3 py-1 text-[14px] font-bold text-accent-text">
                    {plan.tag}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="font-display text-[44px] font-extrabold tracking-[-0.02em]" data-numeric>
                    {formatEuro(plan.monthlyCents)}
                  </span>
                  <span className="mb-2 text-[17px] text-ink3">/mois</span>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[17px] leading-snug text-ink2">
                      <Check className="mt-1 h-[18px] w-[18px] flex-none text-accent" strokeWidth={3} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-[12px] border border-cool px-5 text-[17px] font-bold text-ink transition hover:border-accent"
                >
                  {plan.id === "free" ? "Essayer la démo" : `Choisir ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="questions" className="mx-auto max-w-[760px] border-t border-line py-[72px]">
          <h2 className="text-center font-display text-[36px] font-extrabold tracking-[-0.02em]">
            Questions fréquentes
          </h2>
          <div className="mt-9 flex flex-col gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="rounded-[14px] border border-line bg-panel p-5 px-6">
                <summary className="cursor-pointer list-none text-[19px] font-bold marker:hidden">
                  {q}
                </summary>
                <p className="mt-3 text-[17px] leading-[1.7] text-ink2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="mb-[72px] rounded-2xl border border-warn/30 bg-warn-bg px-8 py-14 text-center">
          <h2 className="font-display text-[38px] font-extrabold tracking-[-0.02em]">
            Votre boutique a des choses à vous dire.
          </h2>
          <p className="mt-3 text-[19px] text-ink2">
            Connectez-la en 1 clic et laissez le Copilot faire le premier rapport.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex min-h-[56px] items-center gap-2.5 rounded-[12px] bg-accent px-8 text-[19px] font-bold text-accent-ink transition hover:brightness-95"
          >
            Commencer gratuitement <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </section>

        {/* ── Pied de page ── */}
        <footer className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line py-8 pb-12 text-[16px] text-ink3">
          <span>© {new Date().getFullYear()} Nightflow Analytics</span>
          <Link href="/confidentialite" className="hover:text-accent-text">Confidentialité</Link>
          <Link href="/conditions" className="hover:text-accent-text">Conditions</Link>
          <Link href="/mentions-legales" className="hover:text-accent-text">Mentions légales</Link>
          <a href="mailto:adrienmaxence4@gmail.com" className="ml-auto hover:text-accent-text">
            Contact
          </a>
        </footer>
      </div>
    </div>
  );
}
