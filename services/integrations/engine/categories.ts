import type { ConnectorCategory } from "./types";

/** Short badge label (for table rows). */
export const CATEGORY_SHORT: Record<ConnectorCategory, string> = {
  commerce: "Ventes",
  advertising: "Publicité",
  email: "Email",
  analytics: "Analyse",
  logistics: "Livraison",
  support: "Support",
};

/**
 * Classifies a marketing-channel name (as stored in the campaigns table) into a
 * category — so the Marketing table can tag paid ads vs email and never imply a
 * pure-analysis tool is a paid campaign.
 */
export function channelCategory(channel: string): ConnectorCategory {
  const c = channel.toLowerCase();
  if (/(email|klaviyo|mailchimp|newsletter|sms)/.test(c)) return "email";
  if (/(analytics|ga4|trafic|audience)/.test(c)) return "analytics";
  if (/(shopify|stripe|paypal|ventes|boutique)/.test(c)) return "commerce";
  // Ads régies (TikTok Ads, Meta Ads, Google Ads, Influenceurs, …).
  return "advertising";
}
