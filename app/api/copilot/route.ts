import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerCopilotQuestion } from "@/services/ai/copilot";
import { buildStoreContext } from "@/services/ai/store-context";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/rate-limit";
import { getUserSubscription } from "@/services/billing/subscription";

/**
 * POST /api/copilot
 * Body: { question: string, conversationId?: string }
 *
 * Generates a real Claude answer grounded in the user's store data (falls
 * back to a deterministic answer when AI isn't configured), and persists the
 * exchange to ai_conversations / ai_messages (best-effort).
 */
export async function POST(req: Request) {
  const { question, conversationId } = (await req
    .json()
    .catch(() => ({}))) as {
    question?: string;
    conversationId?: string;
  };

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }
  // Cap the prompt size — giant questions are an AI-cost attack, not a use case.
  if (question.length > 2_000) {
    return NextResponse.json({ error: "Question trop longue" }, { status: 413 });
  }

  // Burst protection + plan-based daily AI quota (cost control).
  const supabaseForQuota = createClient();
  if (supabaseForQuota) {
    const {
      data: { user },
    } = await supabaseForQuota.auth.getUser();
    if (user) {
      if (!rateLimit(`copilot:${user.id}`, 8, 60_000)) {
        return NextResponse.json(RATE_LIMITED, { status: 429 });
      }
      const { plan } = await getUserSubscription();
      if (!plan.aiUnlimited) {
        const quota = Math.max(plan.aiPerDay, 3); // free keeps a small taste (3/day)
        const used = await countTodayQuestions(supabaseForQuota, user.id);
        if (used >= quota) {
          return NextResponse.json({
            answer:
              plan.id === "scale"
                ? "Quota atteint — réessaie demain."
                : `Tu as utilisé tes ${quota} questions IA du jour. Passe en ${
                    plan.id === "pro" ? "Scale pour l'IA illimitée" : "Pro pour 20 questions/jour"
                  } — ou reviens demain 🌙`,
            source: "quota",
            conversationId: null,
          });
        }
      }
    }
  }

  const ctx = await buildStoreContext();
  const { answer, source } = await answerCopilotQuestion(question, ctx);

  // Persist best-effort — never let a storage hiccup break the chat.
  let convId: string | null = conversationId ?? null;
  try {
    convId = await persist(question, answer, conversationId ?? null);
  } catch {
    /* ignore persistence errors */
  }

  return NextResponse.json({ answer, source, conversationId: convId });
}

/** Counts the user's questions asked since local midnight (DB = exact across instances). */
async function countTodayQuestions(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  try {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { data: convs } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", userId);
    const ids = ((convs as { id: string }[] | null) ?? []).map((c) => c.id);
    if (ids.length === 0) return 0;
    const { count } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", ids)
      .eq("role", "user")
      .gte("created_at", midnight.toISOString());
    return count ?? 0;
  } catch {
    return 0; // fail open on counting — never block a paying user on a hiccup
  }
}

async function persist(
  question: string,
  answer: string,
  conversationId: string | null
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return conversationId;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return conversationId;

  const db = supabase as unknown as SupabaseClient;

  let convId = conversationId;
  if (!convId) {
    const { data } = await db
      .from("ai_conversations")
      .insert({ user_id: user.id, title: question.slice(0, 60) })
      .select("id")
      .single();
    convId = (data as { id: string } | null)?.id ?? null;
  }
  if (!convId) return null;

  await db.from("ai_messages").insert([
    { conversation_id: convId, role: "user", content: question },
    { conversation_id: convId, role: "assistant", content: answer },
  ]);
  return convId;
}
