import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { secureEquals } from "@/lib/secure-compare";
import { resolveProvider } from "@/services/ai/anthropic";
import { AI_MODEL } from "@/services/ai/client";

/**
 * GET /api/health — liveness probe.
 *
 * Anonymous callers get just `{ status: "ok" }`. The build/config detail (mode,
 * AI provider + model) is only returned to a caller holding the CRON secret, so
 * the endpoint can't be used to fingerprint the deployment.
 */
function isTrusted(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  return !!env.cronSecret && secureEquals(header, `Bearer ${env.cronSecret}`);
}

export async function GET(req: Request) {
  if (!isTrusted(req)) {
    return NextResponse.json({ status: "ok" });
  }

  const provider = resolveProvider();
  return NextResponse.json({
    status: "ok",
    app: "Nightflow Analytics",
    mode: isSupabaseConfigured ? "live" : "demo",
    ai: provider === "none" ? "mock" : "live",
    aiProvider: provider,
    aiModel:
      provider === "anthropic"
        ? AI_MODEL
        : provider === "gemini"
          ? env.geminiModel
          : null,
    timestamp: new Date().toISOString(),
  });
}
