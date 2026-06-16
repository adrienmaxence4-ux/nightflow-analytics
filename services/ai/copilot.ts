import { callClaudeText } from "./anthropic";
import { chatSystem, summarySystem } from "./prompts";
import { buildStoreContext, type StoreContext } from "./store-context";
import { COPILOT_ANSWERS } from "@/services/mock/data";

/**
 * SERVER-ONLY. High-level Copilot operations: free-form Q&A and an executive
 * performance summary. Both fall back to deterministic answers when the AI is
 * not configured or a call fails.
 */

/** Answer a free-form question using the real store data as context. */
export async function answerCopilotQuestion(
  question: string,
  ctx?: StoreContext
): Promise<{ source: "ai" | "mock"; answer: string }> {
  const context = ctx ?? (await buildStoreContext());
  const answer = await callClaudeText(
    chatSystem(context.storeName),
    `Données de la boutique :\n${context.summary}\n\nQuestion : ${question}`,
    1024
  );
  if (answer && answer.trim()) {
    return { source: "ai", answer: answer.trim() };
  }
  return { source: "mock", answer: fallbackAnswer(question) };
}

/** Executive summary of store performance. */
export async function summarizeStorePerformance(
  ctx?: StoreContext
): Promise<{ source: "ai" | "mock"; summary: string }> {
  const context = ctx ?? (await buildStoreContext());
  const summary = await callClaudeText(
    summarySystem(context.storeName),
    context.summary,
    600
  );
  if (summary && summary.trim()) {
    return { source: "ai", summary: summary.trim() };
  }
  return {
    source: "mock",
    summary:
      "Votre boutique progresse, portée par vos meilleurs produits et le créneau du soir. Surveillez le stock du produit star et la conversion mobile — ce sont vos deux priorités.",
  };
}

/** Deterministic keyword-matched fallback (mirrors the demo Copilot). */
function fallbackAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("stock") || q.includes("rupture")) return COPILOT_ANSWERS[0];
  if (q.includes("mobile") || q.includes("conversion")) return COPILOT_ANSWERS[1];
  if (
    q.includes("budget") ||
    q.includes("pub") ||
    q.includes("ads") ||
    q.includes("marketing")
  )
    return COPILOT_ANSWERS[2];
  if (q.includes("produit") || q.includes("bundle")) return COPILOT_ANSWERS[3];
  if (q.includes("poster") || q.includes("baisse") || q.includes("pourquoi"))
    return COPILOT_ANSWERS[4];
  return COPILOT_ANSWERS[Math.floor(Math.random() * COPILOT_ANSWERS.length)];
}
