/**
 * Supabase Auth répond en anglais ("Invalid login credentials", "captcha
 * protection: request disallowed (sitekey-secret-mismatch)"). Le client voit
 * une phrase en français qui dit quoi faire ; le détail brut reste dans les
 * logs serveur.
 */
const RULES: ReadonlyArray<[RegExp, string]> = [
  [
    /sitekey-secret-mismatch|invalid-input-secret|missing-input-secret/i,
    "Vérification anti-robot indisponible (erreur de configuration). Réessayez plus tard.",
  ],
  [/captcha/i, "La vérification anti-robot a échoué. Rechargez la page et réessayez."],
  [/invalid login credentials/i, "Email ou mot de passe incorrect."],
  [
    /email not confirmed/i,
    "Confirmez votre adresse email avec le lien reçu, puis reconnectez-vous.",
  ],
  [/already (been )?registered|already exists/i, "Un compte existe déjà avec cet email. Connectez-vous."],
  [/rate limit|too many requests|over_email_send_rate_limit/i, "Trop de tentatives. Réessayez dans quelques minutes."],
  [/password should be|weak password|password is too/i, "Mot de passe trop faible : 10 caractères minimum."],
  [/invalid email|unable to validate email/i, "Adresse email invalide."],
  [/signups? (is )?not allowed|signup is disabled/i, "Les inscriptions sont fermées pour le moment."],
  [/fetch failed|failed to fetch|network/i, "Connexion impossible. Vérifiez votre réseau et réessayez."],
];

export const AUTH_ERROR_FALLBACK = "Échec de l'authentification. Réessayez dans un instant.";

/** True quand Supabase a refusé le jeton hCaptcha — à tracer côté serveur. */
export function isCaptchaError(message: string | undefined): boolean {
  return /captcha/i.test(message ?? "");
}

export function frenchAuthError(message: string | undefined): string {
  const m = message ?? "";
  for (const [re, fr] of RULES) if (re.test(m)) return fr;
  return AUTH_ERROR_FALLBACK;
}
