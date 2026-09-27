/**
 * The funnel Nightflow measures on itself. One closed list, shared by the
 * client helper (lib/track.ts), the API that stores it and the admin view:
 * an event that isn't here is rejected, so the table can't fill with typos.
 *
 * Order is the funnel order — the admin view reads it top to bottom.
 */
export const PRODUCT_EVENTS = [
  "landing_view",
  "cta_click",
  "signup_start",
  "signup_done",
  "onboarding_start",
  "onboarding_done",
  "trial_started",
  "integration_connected",
  "first_brief_view",
  "first_alert_view",
  "app_return",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

export function isProductEvent(name: unknown): name is ProductEventName {
  return typeof name === "string" && (PRODUCT_EVENTS as readonly string[]).includes(name);
}

/** French labels for the admin funnel, in funnel order. */
export const PRODUCT_EVENT_LABELS: Record<ProductEventName, string> = {
  landing_view: "Landing vue",
  cta_click: "Clic sur « Essayer »",
  signup_start: "Inscription commencée",
  signup_done: "Inscription terminée",
  onboarding_start: "Onboarding commencé",
  onboarding_done: "Onboarding terminé",
  trial_started: "Essai activé",
  integration_connected: "Source connectée",
  first_brief_view: "Premier brief vu",
  first_alert_view: "Première alerte ouverte",
  app_return: "Retour dans l'app",
};
