import { NextResponse } from "next/server";
import { askCopilot } from "@/services/copilot.service";

/**
 * POST /api/copilot
 * Body: { question: string }
 *
 * Phase 1: deterministic mock answer.
 * Phase 2: set ANTHROPIC_API_KEY and route through the real LLM inside
 * `copilot.service.ts`.
 */
export async function POST(req: Request) {
  const { question } = (await req.json().catch(() => ({}))) as {
    question?: string;
  };
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }
  const answer = await askCopilot(question);
  return NextResponse.json({ answer });
}
