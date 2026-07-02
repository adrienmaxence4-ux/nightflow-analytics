import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { resolveProvider } from "@/services/ai/anthropic";
import { AI_MODEL } from "@/services/ai/client";

/** GET /api/health — quick status probe for monitoring & Vercel checks. */
export async function GET() {
  const provider = resolveProvider();
  return NextResponse.json({
    status: "ok",
    app: "Nightflow Analytics",
    mode: isSupabaseConfigured ? "live" : "demo",
    ai: provider === "none" ? "mock" : "live",
    aiProvider: provider,
    aiModel: provider === "anthropic" ? AI_MODEL : provider === "github" ? "github-models" : null,
    timestamp: new Date().toISOString(),
  });
}
