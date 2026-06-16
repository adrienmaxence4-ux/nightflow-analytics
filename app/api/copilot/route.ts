import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerCopilotQuestion } from "@/services/ai/copilot";
import { buildStoreContext } from "@/services/ai/store-context";
import { createClient } from "@/lib/supabase/server";

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
