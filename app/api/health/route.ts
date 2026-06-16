import { NextResponse } from "next/server";
import { isAiConfigured, isSupabaseConfigured } from "@/lib/env";

/** GET /api/health — quick status probe for monitoring & Vercel checks. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Nightflow Analytics",
    mode: isSupabaseConfigured ? "live" : "demo",
    ai: isAiConfigured ? "live" : "mock",
    timestamp: new Date().toISOString(),
  });
}
