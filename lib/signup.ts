import { safePublicHttpsBase } from "@/lib/safe-url";

/**
 * Validation de l'inscription et des coordonnées boutique. Pure et sans
 * dépendance, testée seule — la route `/api/auth/signup`, `/api/profile` et
 * le formulaire client appellent le même code, donc un refus a le même
 * message des deux côtés.
 *
 * Le domaine de la boutique sert de seconde clé au registre des essais
 * gratuits (avec l'email normalisé) : recréer un compte avec un autre email
 * ne suffit plus, il faut aussi une autre boutique.
 */

export const STORE_PLATFORMS = [
  { id: "shopify", label: "Shopify" },
  { id: "woocommerce", label: "WooCommerce" },
  { id: "wix", label: "Wix" },
  { id: "prestashop", label: "PrestaShop" },
  { id: "other", label: "Autre" },
] as const;

export type StorePlatform = (typeof STORE_PLATFORMS)[number]["id"];

export const SIGNUP_LIMITS = {
  fullName: 80,
  storeName: 120,
  email: 254,
  passwordMin: 10,
  passwordMax: 128,
} as const;

/** Réseaux sociaux et places de marché : pas une boutique que Nightflow peut analyser. */
const NOT_A_STORE = new Set([
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "pinterest.com",
  "snapchat.com",
  "google.com",
  "gmail.com",
  "etsy.com",
  "aliexpress.com",
  "temu.com",
  "shein.com",
  "leboncoin.fr",
  "cdiscount.com",
  "fnac.com",
  "rakuten.com",
  "wish.com",
  "vercel.app",
  "nightflow-analytics.vercel.app",
]);
const MARKETPLACE_ANY_TLD = /^(amazon|ebay|vinted)\.[a-z.]+$/;

/**
 * Adresses jetables les plus répandues. Liste de départ, pas une barrière
 * absolue : ces services changent de domaine. Le vrai verrou de l'essai est
 * le registre à deux clés + la confirmation d'email.
 */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
  "anonbox.net", "binkmail.com", "bobmail.info", "burnermail.io",
  "byom.de", "crazymailing.com", "deadaddress.com", "despam.it",
  "discard.email", "dispostable.com", "dropmail.me", "emailondeck.com",
  "emailtemporaire.com", "ethereal.email", "fakeinbox.com", "fakemail.net",
  "filzmail.com", "getairmail.com", "getnada.com", "grr.la",
  "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.info", "guerrillamail.net", "guerrillamail.org",
  "guerrillamailblock.com", "harakirimail.com", "inboxbear.com",
  "incognitomail.com", "jetable.com", "jetable.fr.nf", "jetable.net",
  "jetable.org", "kasmail.com", "koszmail.pl", "kurzepost.de",
  "lroid.com", "mail-temporaire.fr", "mail.tm", "mailcatch.com",
  "maildrop.cc", "mailexpire.com", "mailinator.com", "mailinator.net",
  "mailinator2.com", "mailnesia.com", "mailnull.com", "mailsac.com",
  "mailtemp.info", "meltmail.com", "mintemail.com", "mohmal.com",
  "moakt.com", "mytemp.email", "mytrashmail.com", "nada.email",
  "no-spam.ws", "nospam.ze.tc", "nowmymail.com", "objectmail.com",
  "onewaymail.com", "owlpic.com", "pokemail.net", "proxymail.eu",
  "rcpt.at", "rtrtr.com", "sharklasers.com", "shieldemail.com",
  "sneakemail.com", "sogetthis.com", "spam4.me", "spamavert.com",
  "spambox.us", "spamex.com", "spamfree24.org", "spamgourmet.com",
  "spamhole.com", "spaml.com", "squizzy.de", "tafmail.com",
  "temp-mail.io", "temp-mail.org", "tempail.com", "tempe-mail.com",
  "tempemail.co", "tempemail.com", "tempinbox.com", "tempmail.com",
  "tempmail.de", "tempmail.net", "tempmailo.com", "tempr.email",
  "temporaryemail.net", "temporaryinbox.com", "thankyou2010.com",
  "throwam.com", "throwawaymail.com", "tmail.ws", "tmailinator.com",
  "trash-mail.com", "trash-mail.de", "trashmail.com", "trashmail.de",
  "trashmail.me", "trashmail.net", "trashymail.com", "wegwerfmail.de",
  "wegwerfmail.net", "wh4f.org", "yopmail.com", "yopmail.fr",
  "yopmail.net", "zetmail.com", "zippymail.info",
]);

function estAffichable(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 32 && c !== 127;
}

function requiredText(
  raw: unknown,
  min: number,
  max: number,
  champ: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: `${champ} manquant.` };
  const clean = Array.from(raw).filter(estAffichable).join("").replace(/\s+/g, " ").trim();
  if (clean.length < min) {
    return { ok: false, error: `${champ} : ${min} caractères minimum.` };
  }
  if (clean.length > max) {
    return { ok: false, error: `${champ} : ${max} caractères maximum.` };
  }
  return { ok: true, value: clean };
}

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

const HOST_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Hôte public en minuscules, sans www, ou null si ce n'est pas un nom de domaine. */
function hostOf(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 300) return null;
  const withScheme = /^[a-z]+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  const base = safePublicHttpsBase(withScheme.replace(/^http:\/\//, "https://"));
  if (!base) return null;
  const host = base.slice("https://".length).replace(/^www\./, "");
  return HOST_RE.test(host) ? host : null;
}

/** Réseau social ou place de marché : une page, pas une boutique à suivre. */
export function isNotAStore(host: string): boolean {
  for (const blocked of NOT_A_STORE) {
    if (host === blocked || host.endsWith(`.${blocked}`)) return true;
  }
  return MARKETPLACE_ANY_TLD.test(host);
}

/**
 * "https://www.MaBoutique.fr/collections/all" → "maboutique.fr".
 * Null quand ce n'est pas une adresse de boutique publique : IP, hôte local,
 * réseau social, place de marché, ou pas un nom de domaine du tout.
 */
export function normalizeStoreDomain(raw: string): string | null {
  const host = hostOf(raw);
  return host && !isNotAStore(host) ? host : null;
}

export interface StoreFields {
  storeName: string;
  storeDomain: string;
  platform: StorePlatform;
}

export type StoreFieldsParse =
  | { ok: true; value: StoreFields }
  | { ok: false; error: string; field: "storeName" | "storeUrl" | "platform" };

export function parseStoreFields(body: Record<string, unknown>): StoreFieldsParse {
  const name = requiredText(body.storeName, 2, SIGNUP_LIMITS.storeName, "Le nom de la boutique");
  if (!name.ok) return { ...name, field: "storeName" };

  const host = typeof body.storeUrl === "string" ? hostOf(body.storeUrl) : null;
  if (host && isNotAStore(host)) {
    return {
      ok: false,
      field: "storeUrl",
      error:
        "Une page Instagram, Etsy ou Amazon n'est pas une boutique que Nightflow peut suivre. Indiquez le site où vos clients commandent (ex. maboutique.fr ou maboutique.myshopify.com).",
    };
  }
  if (!host) {
    return {
      ok: false,
      field: "storeUrl",
      error:
        "Indiquez l'adresse de votre boutique en ligne (ex. maboutique.fr ou maboutique.myshopify.com).",
    };
  }
  const domain = host;

  const platform = STORE_PLATFORMS.find((p) => p.id === body.platform)?.id;
  if (!platform) {
    return { ok: false, field: "platform", error: "Choisissez votre plateforme e-commerce." };
  }

  return { ok: true, value: { storeName: name.value, storeDomain: domain, platform } };
}

export interface SignupInput extends StoreFields {
  fullName: string;
  email: string;
  password: string;
  captchaToken?: string;
}

export type SignupField =
  | "fullName"
  | "email"
  | "password"
  | "storeName"
  | "storeUrl"
  | "platform";

export type SignupParse =
  | { ok: true; value: SignupInput }
  | { ok: false; error: string; field: SignupField };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseSignup(body: unknown): SignupParse {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Requête invalide.", field: "email" };
  }
  const b = body as Record<string, unknown>;

  const fullName = requiredText(b.fullName, 2, SIGNUP_LIMITS.fullName, "Votre nom");
  if (!fullName.ok) return { ...fullName, field: "fullName" };

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || email.length > SIGNUP_LIMITS.email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Adresse email invalide.", field: "email" };
  }
  if (isDisposableEmail(email)) {
    return {
      ok: false,
      field: "email",
      error:
        "Les adresses jetables ne sont pas acceptées. Utilisez une adresse que vous gardez : Gmail, Outlook ou celle de votre boutique.",
    };
  }

  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < SIGNUP_LIMITS.passwordMin) {
    return {
      ok: false,
      field: "password",
      error: `Mot de passe : ${SIGNUP_LIMITS.passwordMin} caractères minimum.`,
    };
  }
  if (password.length > SIGNUP_LIMITS.passwordMax) {
    return {
      ok: false,
      field: "password",
      error: `Mot de passe : ${SIGNUP_LIMITS.passwordMax} caractères maximum.`,
    };
  }

  const store = parseStoreFields(b);
  if (!store.ok) return store;

  const captchaToken =
    typeof b.captchaToken === "string" && b.captchaToken.length > 0 && b.captchaToken.length < 10_000
      ? b.captchaToken
      : undefined;

  return {
    ok: true,
    value: { fullName: fullName.value, email, password, captchaToken, ...store.value },
  };
}
