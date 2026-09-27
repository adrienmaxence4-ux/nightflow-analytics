import type { BriefItem } from "@/types";

/**
 * The brief shown in the landing hero. Same figures as the playable demo
 * (MoonStore, the sample store) so the page never contradicts itself, and only
 * alerts the detection engine actually raises (campaignReturns,
 * conversionTrend in services/alerts/detect.ts): a prospect who signs up for
 * this gets this. Labelled as fictional wherever it renders.
 */
export const LANDING_BRIEF: BriefItem[] = [
  {
    id: "roas-loss-meta",
    severity: "critical",
    title: "Meta · Retargeting — Large : ROAS 0,80",
    detail: "€412 dépensés pour €330 générés. Chaque euro mis rapporte 80 centimes.",
    since: "7 derniers jours",
    action: "Mets la campagne en pause avant de continuer à brûler du budget.",
    impact: "≈ €350 / mois de budget récupéré",
  },
  {
    id: "conv-drop",
    severity: "warning",
    title: "Conversion : 2,8 % → 1,9 %",
    detail: "Sessions +2 %, panier moyen stable, aucune rupture : le problème est dans le tunnel, pas dans le trafic.",
    since: "vs la semaine précédente",
    action: "Passe une commande test de bout en bout, sur mobile d'abord.",
    impact: "≈ €1 040 / semaine en jeu",
  },
  {
    id: "roas-win-google",
    severity: "positive",
    title: "Google · Marque cartonne : ROAS 7,7",
    detail: "€1 386 générés pour €180 dépensés, +18 % vs la semaine précédente.",
    action: "Augmente le budget par paliers de 20 % en surveillant que le ROAS tient.",
  },
];
