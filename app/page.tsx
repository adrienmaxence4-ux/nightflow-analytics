import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  Download,
  FileText,
  MessageCircleQuestion,
  Moon,
  Radar,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LANDING_PLANS } from "@/lib/plans";
import { DESKTOP, desktopDownloadReady } from "@/lib/desktop";
import { LandingThemeToggle } from "@/components/landing/theme-toggle-landing";
import { CopilotDemo } from "@/components/landing/copilot-demo";
import { PricingTable } from "@/components/landing/pricing-table";
import { FeedbackForm } from "@/components/landing/feedback-form";
import { LANDING_BRIEF } from "@/components/landing/brief-sample";
import { LandingTracker } from "@/components/landing/landing-tracker";
import { BriefPanel } from "@/features/dashboard/brief-panel";

/** Applique la préférence clair/sombre de la landing avant le premier rendu. */
const LANDING_THEME_SCRIPT = `try{if(localStorage.getItem('nightflow:landing-theme')==='clair'){document.getElementById('landing-root').setAttribute('data-theme','clair')}}catch(e){}`;

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

/** Le seul CTA de la page, répété mot pour mot. */
const CTA = "Essayer Nightflow";

/**
 * Photo du fondateur, servie depuis public/. Tant qu'elle vaut null, le bloc
 * fondateur affiche les initiales : jamais d'image cassée ni de photo de stock.
 */
const FOUNDER_PHOTO: string | null = "/fondateur.jpg";

/** Sources qu'un client peut brancher aujourd'hui, dans l'ordre où elles remplissent le brief. */
const CONNECTORS = ["Shopify", "WooCommerce", "Wix", "Stripe", "Klaviyo", "Google Analytics"];

/** Les six chiffres bruts d'un dashboard classique — exacts, et muets. */
const RAW_METRICS: [string, string][] = [
  ["Sessions", "3 412"],
  ["Taux de rebond", "61,2 %"],
  ["Pages / session", "2,8"],
  ["Revenu", "€4 820"],
  ["Panier moyen", "€34"],
  ["Conversion", "2,1 %"],
];

/** Ce que Nightflow fait de tes chiffres, dans l'ordre où il le fait. */
const HOW = [
  {
    n: "1",
    t: "Il surveille",
    d: "Chaque matin, il relit tes ventes, ton trafic, tes pubs et ton stock. Toi, tu ne relis rien.",
  },
  {
    n: "2",
    t: "Il détecte",
    d: "Un tunnel mobile qui décroche, une pub qui perd, un stock qui va manquer : il repère ce qui a changé de façon inhabituelle.",
  },
  {
    n: "3",
    t: "Il explique",
    d: "La cause probable, avec tes données. Quand une donnée manque pour trancher, il le dit au lieu d'inventer.",
  },
  {
    n: "4",
    t: "Il priorise",
    d: "Trois lignes, classées par ce qui coûte le plus. Tu décides. Le détail reste à un clic.",
  },
];

const BENEFITS: [typeof Radar, string, string][] = [
  [Radar, "Les changements inhabituels te trouvent, pas l'inverse", "Un moteur déterministe compare chaque métrique à sa semaine précédente — CA, conversion, trafic, panier, stock, ROAS par campagne — et cite les chiffres exacts qui l'ont fait réagir."],
  [MessageCircleQuestion, "Demande « pourquoi » et obtiens une réponse chiffrée", "« Pourquoi mes ventes baissent ? » « Où est-ce que je perds de l'argent cette semaine ? » La réponse s'appuie sur tes données importées. Quand il en manque une, il le dit."],
  [FileText, "Un résumé clair sans lire tes graphiques", "Un rapport PDF, Excel ou Word en un clic, à partir de tes vraies données — pour un associé, un comptable ou toi le dimanche soir."],
];

const FAQ: [string, string][] = [
  [
    "Combien de temps pour le brancher ?",
    "Cinq à dix minutes. Tu crées un compte, tu confirmes ton email, tu actives tes 30 jours gratuits, puis tu colles une clé en lecture seule créée depuis Shopify, WooCommerce, Wix ou Stripe — le guide est sur la page de connexion. Klaviyo s'autorise depuis ton compte, sans clé à coller. Le premier brief arrive dès que tes commandes sont importées.",
  ],
  [
    "Pourquoi pas Shopify Analytics ou Google Analytics ?",
    "Ils te donnent tous les chiffres et te laissent chercher lequel compte. Nightflow ne remplace pas leurs graphiques : il les lit à ta place chaque matin, repère ce qui a changé, l'explique et te dit par quoi commencer. Le détail reste disponible quand tu veux creuser.",
  ],
  [
    "Mes données sont-elles en sécurité ?",
    "Chaque compte est isolé au niveau de la base (Row-Level Security) et les clés d'accès sont chiffrées (AES-256). Une clé en lecture seule suffit pour le brief et les alertes ; si un jour tu veux que Nightflow applique une action à ta place, il te demandera d'abord un accès en écriture, et chaque action se défait en un clic. Il n'importe jamais les données personnelles de tes clients, seulement des métriques. Rien n'est revendu.",
  ],
  [
    "Et si je veux arrêter ?",
    "L'essai s'arrête seul au bout de 30 jours si tu ne fais rien : aucune carte n'est demandée. Un abonnement se résilie en deux clics depuis la page Abonnement, et tu gardes l'accès jusqu'à la fin de la période payée.",
  ],
];

/**
 * Données structurées. Organization et WebSite disent à Google le nom du site.
 * FAQPage et SoftwareApplication dérivent des constantes ci-dessus et de
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
      operatingSystem: "Web, Windows",
      inLanguage: "fr-FR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Surveille une boutique e-commerce (Shopify, WooCommerce, Wix, Stripe, Klaviyo, GA4), détecte les changements importants, explique la cause probable et dit quoi faire — dans un brief quotidien de 30 secondes.",
      offers: LANDING_PLANS.map((p) => ({
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

const H2 = "text-center font-display text-[32px] font-extrabold tracking-[-0.02em] sm:text-[40px]";
const SUB = "mx-auto mt-3 max-w-[52ch] text-center text-[18px] leading-relaxed text-ink3 sm:text-[19px]";
/** The same primitives as the app: one button, three sizes, no bespoke heights. */
const PRIMARY = buttonVariants({ size: "lg" });
const SECONDARY = buttonVariants({ variant: "outline", size: "lg" });
/** Inline text links still get a 48 px hit zone. */
const TEXT_LINK = "inline-flex min-h-tap items-center font-semibold text-accent-text hover:underline";
const SUMMARY =
  "flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 p-5 px-6 font-bold marker:hidden [&::-webkit-details-marker]:hidden";

/**
 * Landing publique — la porte d'entrée des visiteurs non connectés.
 * Toujours en mode sombre par défaut : le conteneur racine force
 * `data-theme="sombre"`, qui redéclare les variables de thème pour toute la
 * page, quel que soit le thème global de l'utilisateur.
 *
 * Server Component. Trois îlots clients : l'interrupteur de thème, la démo
 * jouable et la bascule de tarifs. Le brief du hero est rendu côté serveur
 * avec le même composant que l'app.
 */
export default function LandingPage() {
  const nonce = headers().get("x-nonce") ?? undefined;
  // Server Component : on sait ici si une source de téléchargement est
  // configurée, donc on n'affiche jamais un bouton qui mène au vide.
  const bureauDisponible = desktopDownloadReady();
  return (
    <div
      id="landing-root"
      data-theme="sombre"
      className="min-h-screen text-ink [background:linear-gradient(180deg,#0d1219,#08090c_55%)] data-[theme=clair]:[background:linear-gradient(180deg,var(--panel),var(--bg)_55%)]"
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

      <LandingTracker />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        {/* ── Nav ── une ligne à toute largeur. Sur téléphone : logo, connexion,
            CTA — les ancres sont à un pouce de défilement, elles ne valent pas
            un écran entier. ── */}
        <header className="flex items-center gap-3 py-4 sm:gap-5 sm:py-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Nightflow Analytics, accueil">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-accent sm:h-11 sm:w-11">
              <Moon className="h-[21px] w-[21px] text-accent-ink" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="hidden font-display text-[19px] font-extrabold tracking-[0.02em] sm:inline">
              NIGHTFLOW <span className="font-semibold text-ink3">ANALYTICS</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 text-[16px] font-semibold sm:gap-4" aria-label="Navigation">
            <a href="#fonctionnement" className="hidden px-1 text-ink hover:text-accent-text lg:inline">Comment ça marche</a>
            <a href="#demo" className="hidden px-1 text-ink hover:text-accent-text lg:inline">Démo</a>
            <a href="#tarifs" className="hidden px-1 text-ink hover:text-accent-text lg:inline">Tarifs</a>
            <span className="hidden md:inline">
              <LandingThemeToggle />
            </span>
            <Link
              href="/login"
              className={`${buttonVariants({ variant: "outline", size: "md" })} border-transparent px-3 sm:border-line sm:px-5`}
            >
              Se connecter
            </Link>
            <Link href="/signup" className={`${buttonVariants({ size: "md" })} px-4 sm:px-6`}>
              {CTA}
            </Link>
          </nav>
        </header>

        <main id="contenu">
          {/* ── Hero ── le brief tient lieu de visuel : c'est l'écran que le
              client verra chaque matin, avec la boutique fictive. ── */}
          <section id="hero" className="grid items-center gap-10 py-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))] sm:py-10 lg:gap-14">
            <div>
              <h1 className="fade-up font-display text-[clamp(36px,8vw,60px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
                Sache ce qui mérite <span className="text-accent-text">ton attention.</span>
              </h1>
              <p className="fade-up-1 mt-6 max-w-[38ch] text-[19px] leading-relaxed text-ink2 sm:text-[21px]">
                Nightflow surveille ton e-commerce, détecte les changements importants
                et t&apos;explique quoi faire ensuite.
              </p>
              <div className="fade-up-2 mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={PRIMARY}>
                  {CTA} <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <a href="#fonctionnement" className={SECONDARY}>
                  Voir comment ça fonctionne
                </a>
              </div>
              <ul className="fade-up-3 mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-[16px] text-ink3">
                {["30 jours gratuits, sans carte", "Shopify, WooCommerce, Wix, Stripe", "Lecture : 30 secondes par jour"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-[18px] w-[18px] flex-none text-accent" strokeWidth={3} aria-hidden />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="fade-up-2">
              <BriefPanel
                items={LANDING_BRIEF}
                animate
                tag={
                  <span className="rounded-pill border border-line px-3 py-1 text-[13px] font-bold tracking-[0.04em] text-ink3">
                    BOUTIQUE FICTIVE
                  </span>
                }
                footer={
                  <a href="#demo" className={TEXT_LINK}>
                    Explorer cette boutique →
                  </a>
                }
              />
            </div>
          </section>

          {/* ── Connecteurs ── */}
          <section className="border-y border-line py-7 text-center">
            <p className="text-[14px] font-bold tracking-[0.14em] text-ink3">SE CONNECTE À</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[18px] font-bold text-ink2 sm:text-[19px]">
              {CONNECTORS.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </section>

          {/* ── Le problème ── la même journée, vue par un dashboard puis par
              Nightflow. C'est l'écart qui vend, pas la liste de features. ── */}
          <section className="py-16 sm:py-[72px]">
            <h2 className={H2}>Ton e-commerce te donne des centaines de chiffres.</h2>
            <p className={SUB}>Nightflow te montre ceux qui méritent ton attention. Le même mardi, deux fois :</p>

            <div className="mt-12 grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
              {/* Avant — volontairement terne. Les chiffres sont exacts et muets. */}
              <div className="flex flex-col rounded-lg border border-line bg-panel2 p-6 sm:p-8">
                <span className="text-[14px] font-bold tracking-[0.1em] text-ink3">
                  TON DASHBOARD AUJOURD&apos;HUI
                </span>
                <div className="mt-6 grid flex-1 gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fit,minmax(110px,1fr))]">
                  {RAW_METRICS.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[14px] text-ink3">{label}</div>
                      <div className="mt-0.5 font-display text-[22px] font-extrabold text-ink3" data-numeric>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-7 border-t border-line pt-5 text-[17px] leading-relaxed text-ink3">
                  Six chiffres exacts. Aucune décision. À toi de deviner lequel compte
                  aujourd&apos;hui, et ce qu&apos;il faut en faire.
                </p>
              </div>

              {/* Après — une phrase, une action, un montant. */}
              <div className="flex flex-col rounded-lg border border-accent bg-panel p-6 sm:p-8">
                <span className="text-[14px] font-bold tracking-[0.1em] text-accent-text">
                  LE MÊME MARDI, AVEC NIGHTFLOW
                </span>
                <p className="mt-6 font-display text-[24px] font-extrabold leading-[1.25] tracking-[-0.015em] sm:text-[26px]">
                  Le trafic tient. C&apos;est la conversion qui a décroché cette semaine : 2,8 % → 1,9 %.
                </p>
                <p className="mt-4 flex-1 text-[18px] leading-relaxed text-ink2">
                  Sessions +2 %, panier moyen stable, aucune rupture. Le problème est dans le
                  tunnel, pas dans le trafic. Nightflow ne voit pas à quelle étape — il te le
                  dit, au lieu de l&apos;inventer.
                </p>
                <p className="mt-7 flex gap-2.5 border-t border-line pt-5 text-[17px] font-semibold leading-relaxed text-ink">
                  <ArrowRight className="mt-1 h-5 w-5 flex-none text-accent-text" aria-hidden />
                  Passe une commande test de bout en bout — ≈ €1 040 par semaine en jeu.
                </p>
              </div>
            </div>
          </section>

          {/* ── Comment ça fonctionne ── */}
          <section id="fonctionnement" className="scroll-mt-6 border-t border-line py-16 sm:py-[72px]">
            <h2 className={H2}>Il surveille. Il détecte. Il explique. Il priorise.</h2>
            <p className={SUB}>Puis tu décides. Voilà tout le produit.</p>
            <div className="mt-12 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
              {HOW.map((s) => (
                <div key={s.n} className="rounded-lg border border-line bg-panel p-6 sm:p-8">
                  <span className="grid h-[48px] w-[48px] place-items-center rounded-pill bg-accent font-display text-[22px] font-extrabold text-accent-ink">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-[22px] font-bold">{s.t}</h3>
                  <p className="mt-2.5 text-[17px] leading-relaxed text-ink2">{s.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Démo ── le visiteur pose les questions qu'il se pose vraiment,
              sur une boutique fictive annoncée comme telle. ── */}
          <section id="demo" className="scroll-mt-6 border-t border-line py-16 sm:py-[72px]">
            <h2 className={H2}>Explore une boutique fictive</h2>
            <p className={SUB}>
              MoonStore n&apos;existe pas, ses chiffres sont inventés pour la démo. Le format, lui,
              est celui que tu recevras chaque matin : un verdict, les chiffres derrière, une action.
            </p>
            <div className="mx-auto mt-10 max-w-[860px]">
              <CopilotDemo />
            </div>
          </section>

          {/* ── Bénéfices ── trois, pas six, et formulés par ce qu'ils changent. ── */}
          <section className="border-t border-line py-16 sm:py-[72px]">
            <h2 className={H2}>Trois choses que ton dashboard ne fait pas</h2>
            <div className="mt-12 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
              {BENEFITS.map(([Icon, t, d]) => (
                <div key={t} className="rounded-lg border border-line bg-panel2 p-6">
                  <Icon className="h-6 w-6 text-accent-text" strokeWidth={2} aria-hidden />
                  <h3 className="mt-3.5 text-[19px] font-bold leading-snug">{t}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-ink3">{d}</p>
                </div>
              ))}
            </div>
            {bureauDisponible && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-panel2 p-6">
                <BellRing className="h-6 w-6 flex-none text-accent-text" strokeWidth={2} aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[19px] font-bold leading-snug">Prévenu sans ouvrir Nightflow</h3>
                  <p className="mt-1 text-[16px] leading-relaxed text-ink3">
                    L&apos;agent Windows vérifie tes alertes toutes les 30 minutes, navigateur fermé, et
                    n&apos;envoie une notification que si quelque chose a changé. {DESKTOP.minOs} · ≈ {DESKTOP.windowsSizeMb} Mo.
                  </p>
                </div>
                <Link href="/telecharger" className={`${TEXT_LINK} gap-1.5`}>
                  <Download className="h-4 w-4" aria-hidden /> Télécharger
                </Link>
              </div>
            )}
          </section>

          {/* ── Pour qui + ce qu'il ne fait pas ── deux colonnes de confiance. ── */}
          <section className="border-t border-line py-16 sm:py-[72px]">
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
              <div className="rounded-lg border border-accent bg-panel p-6 sm:p-8">
                <h2 className="font-display text-[26px] font-extrabold tracking-[-0.015em]">C&apos;est pour toi si…</h2>
                <p className="mt-4 text-[18px] leading-relaxed text-ink2">
                  Tu tiens une petite ou moyenne boutique sur Shopify, WooCommerce ou Wix.
                  Tu regardes ton chiffre du jour tous les soirs, sans le temps d&apos;ouvrir
                  Analytics pour comprendre ce qui a bougé. Tu veux savoir vite ce qui se
                  passe, et par quoi commencer.
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-ink3">
                  Une agence ou une boutique à plusieurs milliers de commandes par jour peut
                  l&apos;utiliser aussi, mais ce n&apos;est pas pour elle qu&apos;il est construit.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-6 sm:p-8">
                <h2 className="font-display text-[26px] font-extrabold tracking-[-0.015em]">Ce que Nightflow ne fait pas</h2>
                <ul className="mt-4 flex flex-col gap-3 text-[17px] leading-relaxed text-ink2">
                  {[
                    "Il n'invente pas de chiffres. Le moteur d'alertes est déterministe et cite les données qui l'ont déclenché ; quand il manque une donnée pour conclure, il le dit.",
                    "Il n'importe pas les données personnelles de tes clients : des métriques, jamais des noms ni des adresses.",
                    "Il ne modifie rien dans ta boutique sans que tu cliques « Appliquer » et sans un accès en écriture que tu lui donnes exprès. Il recommande, tu décides, et chaque action se défait en un clic.",
                    "Il ne te notifie pas pour le plaisir. Pas de changement, pas de notification.",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check className="mt-1.5 h-[18px] w-[18px] flex-none text-accent" strokeWidth={3} aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Fondateur ── un visage et une adresse qui répond : la preuve
              qu'on peut donner avant d'avoir des avis. ── */}
          <section id="fondateur" className="border-t border-line py-16 sm:py-[72px]">
            <div className="mx-auto flex max-w-[760px] flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
              {FOUNDER_PHOTO ? (
                <Image
                  src={FOUNDER_PHOTO}
                  alt="Adrien, fondateur de Nightflow"
                  width={112}
                  height={112}
                  className="h-28 w-28 flex-none rounded-pill border border-line object-cover"
                />
              ) : (
                <span
                  className="grid h-28 w-28 flex-none place-items-center rounded-pill border border-line bg-panel2 font-display text-display text-accent-text"
                  aria-hidden
                >
                  AM
                </span>
              )}
              <div>
                <h2 className="font-display text-[26px] font-extrabold tracking-[-0.015em]">
                  Derrière Nightflow, il y a une personne
                </h2>
                <p className="mt-4 text-body text-ink2">
                  Moi, Adrien. Je construis Nightflow seul. Pas de service client
                  sous-traité : quand tu écris, c&apos;est moi qui lis et qui réponds.
                </p>
                <p className="mt-3 text-small text-ink3">
                  Je l&apos;ai fait parce qu&apos;un dashboard donne des chiffres, pas des
                  décisions. Un chiffre te paraît faux ? Dis-le-moi, je vérifie.
                </p>
                <a href="mailto:adrienmaxence4@gmail.com" className={`${TEXT_LINK} mt-2`}>
                  Écris-moi →
                </a>
              </div>
            </div>
          </section>

          {/* ── Tarifs ── */}
          <section id="tarifs" className="scroll-mt-6 border-t border-line py-16 sm:py-[72px]">
            <h2 className={H2}>Gratuit pour regarder, 9 € par mois pour brancher ta boutique</h2>
            <p className={SUB}>
              Une commande manquée sur un tunnel mobile cassé coûte plus qu&apos;un mois de Nightflow.
            </p>
            <PricingTable />
          </section>

          {/* ── FAQ ── */}
          <section id="questions" className="mx-auto max-w-[760px] border-t border-line py-16 sm:py-[72px]">
            <h2 className={H2}>Quatre questions avant d&apos;essayer</h2>
            <div className="mt-9 flex flex-col gap-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group rounded-lg border border-line bg-panel">
                  <summary className={`${SUMMARY} text-[18px] sm:text-[19px]`}>
                    {q}
                    <ChevronDown className="h-5 w-5 flex-none text-ink3 transition duration-base group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="px-6 pb-5 text-[17px] leading-[1.7] text-ink2">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── CTA final ── même libellé que le hero. ── */}
          <section id="cta-final" className="mb-10 rounded-[16px] border border-line bg-warn-bg px-6 py-12 text-center sm:px-8 sm:py-14">
            <h2 className="font-display text-[30px] font-extrabold tracking-[-0.02em] sm:text-[38px]">
              Demain matin, tu sauras quoi regarder.
            </h2>
            <p className="mt-3 text-[18px] text-ink2 sm:text-[19px]">
              30 jours gratuits, sans carte. Le premier brief arrive avec tes premières commandes importées.
            </p>
            <Link href="/signup" className={`${PRIMARY} mt-7 px-8`}>
              {CTA} <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </section>

          {/* ── Avis ── replié : la donnée arrive dans /admin, mais un formulaire
              de 800 px entre le CTA et le pied de page n'aidait personne. ── */}
          <details id="avis" className="group mb-10 rounded-lg border border-line bg-panel">
            <summary className={`${SUMMARY} text-[17px]`}>
              Tu as dix secondes ? Dis-moi ce que tu en penses.
              <ChevronDown className="h-5 w-5 flex-none text-ink3 transition duration-base group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-6 pb-5">
              <p className="text-[16px] text-ink3">
                Nightflow est jeune et je le construis seul. Ton avis oriente ce que je fais ensuite.
              </p>
              <div className="mt-5">
                <FeedbackForm />
              </div>
            </div>
          </details>
        </main>

        {/* ── Pied de page ── */}
        <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line py-6 pb-10 text-[16px] text-ink3">
          <span className="inline-flex min-h-tap items-center">© {new Date().getFullYear()} Nightflow Analytics</span>
          <Link href="/confidentialite" className="inline-flex min-h-tap items-center hover:text-accent-text">Confidentialité</Link>
          <Link href="/conditions" className="inline-flex min-h-tap items-center hover:text-accent-text">Conditions</Link>
          <Link href="/mentions-legales" className="inline-flex min-h-tap items-center hover:text-accent-text">Mentions légales</Link>
          {bureauDisponible && (
            <Link href="/telecharger" className="inline-flex min-h-tap items-center hover:text-accent-text">App Windows</Link>
          )}
          <a href="mailto:adrienmaxence4@gmail.com" className="ml-auto inline-flex min-h-tap items-center hover:text-accent-text">
            Contact
          </a>
        </footer>
      </div>
    </div>
  );
}
