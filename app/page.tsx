import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
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
import { PLAN_LIST } from "@/lib/plans";
import { LandingThemeToggle } from "@/components/landing/theme-toggle-landing";
import { CopilotDemo } from "@/components/landing/copilot-demo";
import { PricingTable } from "@/components/landing/pricing-table";
import { FeedbackForm } from "@/components/landing/feedback-form";

/** Applique la préférence clair/sombre de la landing avant le premier rendu. */
const LANDING_THEME_SCRIPT = `try{if(localStorage.getItem('nightflow:landing-theme')==='sombre'){document.getElementById('landing-root').setAttribute('data-theme','sombre')}}catch(e){}`;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nightflow-analytics.vercel.app";

/**
 * Canonique auto-référencée. Elle se pose ici, page par page, et jamais dans le
 * layout racine : une canonique « / » héritée ferait pointer /conditions,
 * /telecharger et les autres vers l'accueil, ce qui les désindexerait.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

/** Les six chiffres bruts d'un dashboard classique — exacts, et muets. */
const RAW_METRICS: [string, string][] = [
  ["Sessions", "3 412"],
  ["Taux de rebond", "61,2 %"],
  ["Pages / session", "2,8"],
  ["Revenu", "€4 820"],
  ["Panier moyen", "€34"],
  ["Conversion", "2,1 %"],
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

/**
 * Données structurées. Organization et WebSite disent à Google le nom du site.
 * FAQPage et SoftwareApplication sont dérivés des constantes ci-dessus et de
 * lib/plans : le balisage ne peut donc pas se désynchroniser de la page.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Nightflow Analytics",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: "adrienmaxence4@gmail.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Nightflow Analytics",
      alternateName: "Nightflow",
      url: SITE_URL,
      inLanguage: "fr-FR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Nightflow Analytics",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS",
      inLanguage: "fr-FR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Copilote IA pour e-commerce : connecte Shopify, Wix, WooCommerce, Stripe, Klaviyo et GA4, puis explique ce qui se passe, pourquoi, et quoi faire.",
      offers: PLAN_LIST.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: (p.monthlyCents / 100).toFixed(2),
        priceCurrency: "EUR",
        url: `${SITE_URL}/signup`,
        availability: "https://schema.org/InStock",
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

/**
 * Landing publique — la porte d'entrée des visiteurs non connectés.
 * Clair par défaut, comme l'application : le conteneur racine porte
 * `data-theme="clair"`, qui redéclare les variables de thème pour toute la
 * page. Le visiteur peut basculer en sombre ; son choix est relu avant le
 * premier rendu par le script ci-dessus, donc sans clignotement.
 *
 * Le fond est un dégradé --panel → --bg : une seule règle qui suit le thème,
 * plutôt qu'un dégradé sombre écrit en dur doublé d'une variante claire.
 *
 * Server Component. Seuls trois îlots sont clients : l'interrupteur de thème,
 * la démo du copilote et la bascule de tarifs.
 */
export default function LandingPage() {
  const nonce = headers().get("x-nonce") ?? undefined;
  return (
    <div
      id="landing-root"
      data-theme="clair"
      className="min-h-screen text-ink [background:linear-gradient(180deg,var(--panel),var(--bg)_55%)]"
    >
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: LANDING_THEME_SCRIPT }}
      />
      {/* JSON-LD : données, pas du JS exécutable — non soumis à script-src, donc
          pas de nonce (éviterait un warning d'hydratation sur l'attribut). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* Lien d'évitement — le clavier ne doit pas retraverser la nav. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[12px] focus:bg-accent focus:px-5 focus:py-3 focus:text-[16px] focus:font-bold focus:text-accent-ink"
      >
        Aller au contenu
      </a>

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
            <a href="#demo" className="text-ink hover:text-accent-text">Démo</a>
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

        <main id="contenu">
          {/* ── Hero ── la démo tient lieu de visuel produit : elle se joue,
              elle ne se regarde pas. ── */}
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
                <a
                  href="#demo"
                  className="inline-flex min-h-[56px] items-center rounded-[12px] border border-cool px-6 text-[19px] font-semibold text-ink transition hover:border-accent"
                >
                  Poser une question au copilote
                </a>
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

          {/* Aperçu produit : une vraie analyse, telle que l'app la rend.
              Volontairement statique et sans commande à actionner — le haut
              de page pose la promesse, il ne demande rien. La version jouable
              est plus bas, une fois la promesse lue. */}
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

          {/* ── Démo jouable ── le hero pose la promesse, ici on la laisse
              vérifier. Placée après les connecteurs plutôt que dans le hero :
              des commandes à actionner en haut de page rendent l'accueil
              nerveux, alors que l'aperçu statique le laisse respirer. ── */}
          <section id="demo" className="scroll-mt-8 py-[72px]">
            <h2 className="text-center font-display text-[40px] font-extrabold tracking-[-0.02em]">
              Posez-lui une question
            </h2>
            <p className="mx-auto mb-10 mt-3 max-w-[54ch] text-center text-[19px] leading-relaxed text-ink3">
              Quatre questions que vous vous posez déjà. Les réponses sont celles du
              Copilot sur la boutique d&apos;exemple.
            </p>
            <div className="mx-auto max-w-[760px]">
              <CopilotDemo />
            </div>
          </section>

          {/* ── Le contraste ── la même journée, vue par un dashboard puis par
              Nightflow. C'est l'écart qui vend, pas la liste de features. ── */}
          <section className="border-t border-line py-[72px]">
            <h2 className="text-center font-display text-[40px] font-extrabold tracking-[-0.02em]">
              Le même mardi, deux fois
            </h2>
            <p className="mx-auto mt-3 max-w-[52ch] text-center text-[19px] text-ink3">
              Vos données ne manquent pas. C&apos;est leur interprétation qui manque.
            </p>

            <div className="mt-12 grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              {/* Avant — volontairement terne. Les chiffres sont exacts et muets. */}
              <div className="flex flex-col rounded-lg border border-line bg-panel2 p-8">
                <span className="text-[15px] font-bold tracking-[0.1em] text-ink3">
                  VOTRE DASHBOARD AUJOURD&apos;HUI
                </span>
                <div className="mt-6 grid flex-1 gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(110px,1fr))]">
                  {RAW_METRICS.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[15px] text-ink3">{label}</div>
                      <div
                        className="mt-0.5 font-display text-[22px] font-extrabold text-ink3"
                        data-numeric
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-7 border-t border-line pt-5 text-[17px] leading-relaxed text-ink3">
                  Six chiffres exacts. Aucune décision. À vous de deviner lequel compte
                  aujourd&apos;hui, et ce qu&apos;il faut en faire.
                </p>
              </div>

              {/* Après — une phrase, une action, un montant. */}
              <div className="flex flex-col rounded-lg border border-accent bg-panel p-8">
                <span className="text-[15px] font-bold tracking-[0.1em] text-accent-text">
                  LE MÊME MARDI, AVEC NIGHTFLOW
                </span>
                <p className="mt-6 font-display text-[26px] font-extrabold leading-[1.25] tracking-[-0.015em]">
                  Le trafic tient. C&apos;est la conversion mobile qui décroche depuis mardi.
                </p>
                <p className="mt-4 flex-1 text-[18px] leading-relaxed text-ink2">
                  Desktop inchangé à 4,3 %. Mobile tombé de 2,8 % à 1,1 %, avec −62 % de paniers
                  menés au bout. La bascule est datée et localisée dans le tunnel de paiement.
                </p>
                <p className="mt-7 flex gap-2.5 border-t border-line pt-5 text-[17px] font-semibold leading-relaxed text-ink">
                  <ArrowRight className="mt-1 h-5 w-5 flex-none text-accent-text" aria-hidden />
                  Testez le paiement mobile en priorité — ≈ €1 240 par semaine en jeu.
                </p>
              </div>
            </div>
          </section>

          {/* ── 3 étapes ── */}
          <section className="border-t border-line py-[72px]">
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
            <PricingTable />
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

          {/* ── Avis ── remplace le widget de retours d'un tiers : la donnée
              arrive dans /admin, et les bons avis alimenteront la preuve
              sociale qui manque encore à cette page. ── */}
          <section id="avis" className="border-t border-line py-[72px]">
            <h2 className="text-center font-display text-[36px] font-extrabold tracking-[-0.02em]">
              Vous en pensez quoi ?
            </h2>
            <p className="mx-auto mb-10 mt-3 max-w-[52ch] text-center text-[19px] leading-relaxed text-ink3">
              Nightflow est jeune et je le construis seul. Dix secondes de votre part
              orientent ce que je fais ensuite.
            </p>
            <FeedbackForm />
          </section>

          {/* ── CTA final ── */}
          <section className="mb-[72px] rounded-[16px] border border-warn/30 bg-warn-bg px-8 py-14 text-center">
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
        </main>

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
