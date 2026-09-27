import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerCopilotQuestion } from "@/services/ai/copilot";
import { buildStoreContext } from "@/services/ai/store-context";
import { resolveAiAction } from "@/services/actions/suggest";
import type { ProductRow } from "@/types/database";
import type { SuggestedAction } from "@/types";
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    question?: unknown;
    conversationId?: unknown;
  };
  const question = typeof body.question === "string" ? body.question : "";
  // Anything that isn't a uuid starts a fresh thread. Ownership is checked in
  // persist(): a foreign id used to make the insert fail silently, so the
  // exchange was never stored and the daily quota — counted from stored
  // messages — never moved.
  const conversationId =
    typeof body.conversationId === "string" && UUID_RE.test(body.conversationId)
      ? body.conversationId
      : null;

  if (!question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }
  // Cap the prompt size — giant questions are an AI-cost attack, not a use case.
  if (question.length > 2_000) {
    return NextResponse.json({ error: "Question trop longue" }, { status: 413 });
  }

  // Every path below this point makes a real, metered AI call. The chat is
  // only ever rendered from the logged-in app (features/copilot/copilot-chat),
  // so an anonymous caller has no legitimate reason to reach it — and without
  // this gate, rateLimit() below only keys off user.id and silently does
  // nothing for a request with no session, leaving the route wide open to an
  // unauthenticated script that burns the AI quota in a tight loop.
  const supabaseForQuota = createClient();
  if (!supabaseForQuota) {
    return NextResponse.json({ error: "offline" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabaseForQuota.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!rateLimit(`copilot:${user.id}`, 8, 60_000)) {
    return NextResponse.json(RATE_LIMITED, { status: 429 });
  }

  // Nothing imported yet: say so. No model call, no quota spent, no MoonStore
  // answer passed off as this store's — "demo" included, the caller is signed in.
  const ctx = await buildStoreContext();
  if (ctx.source !== "db") {
    return NextResponse.json({
      answer:
        "Je n'ai pas encore de données sur ta boutique. Connecte-la depuis **Connexions** : dès la première synchronisation, je réponds avec tes vrais chiffres.",
      source: "empty",
      action: null,
      conversationId: null,
    });
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

  const { answer, source, hint } = await answerCopilotQuestion(question, ctx);

  // The model may name an action; it never gets to say what it touches. Every
  // target is re-resolved against this store's real catalogue, so an invented
  // product yields no button rather than a write to the wrong thing.
  let action: SuggestedAction | null = null;
  if (hint && ctx.storeId && supabaseForQuota) {
    try {
      const { data } = await supabaseForQuota
        .from("products")
        .select("*")
        .eq("store_id", ctx.storeId);
      action = resolveAiAction(hint, (data as ProductRow[] | null) ?? []);
    } catch {
      /* no button is always safe */
    }
  }

  // Persist best-effort — never let a storage hiccup break the chat.
  let convId: string | null = conversationId ?? null;
  try {
    convId = await persist(question, answer, conversationId ?? null);
  } catch {
    /* ignore persistence errors */
  }

  return NextResponse.json({ answer, source, action, conversationId: convId });
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

  // A thread id the caller doesn't own is dropped, not trusted: the messages
  // then land in a new conversation of theirs and count toward their quota.
  let convId = conversationId;
  if (convId) {
    const { data: owned } = await db
      .from("ai_conversations")
      .select("id")
      .eq("id", convId)
      .eq("user_id", user.id)
      .limit(1);
    if (!owned?.length) convId = null;
  }
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
