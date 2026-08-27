import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { secureEquals } from "@/lib/secure-compare";
import { inworldTTS, InworldError } from "@/lib/tts";

/**
 * POST /api/automation/tts
 *
 * French voice-over for Adrien's scheduled Auto-Growth routine. The routine has
 * no browser session, so — like /api/automation/reel-inspiration and
 * /api/admin/voice-summary — CRON_SECRET as a Bearer token is the only door.
 *
 * Body: { text: string, voice?: string, speakingRate?: number }
 * Success: raw `audio/mpeg` bytes (Inworld returns MP3; every browser plays it).
 *          The routine pipes this straight to a file and uploads it to Drive.
 * Failure: JSON { error }.
 */
export const dynamic = "force-dynamic";
// Inworld retries transient failures up to 3× at 25s each — give it room.
export const maxDuration = 60;

/** Inworld's own request cap; also keeps a runaway prompt from being billed. */
const MAX_CHARS = 5000;

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  return !!env.cronSecret && secureEquals(header, `Bearer ${env.cronSecret}`);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!env.inworldKey) {
    return NextResponse.json(
      { error: "voice-over not configured (INWORLD_API_KEY missing)" },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: unknown;
    voice?: unknown;
    speakingRate?: unknown;
  };

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `text exceeds ${MAX_CHARS} characters` },
      { status: 413 }
    );
  }

  const voice = typeof body.voice === "string" ? body.voice : undefined;
  const speakingRate =
    typeof body.speakingRate === "number" && body.speakingRate > 0
      ? body.speakingRate
      : 1;

  try {
    const speech = await inworldTTS(text, { voice, speakingRate });
    const audio = Buffer.from(speech.base64, "base64");
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": speech.mime,
        "Content-Length": String(audio.length),
        "Content-Disposition": 'inline; filename="voix.mp3"',
        "Cache-Control": "no-store",
        "X-Voice": speech.voice,
        "X-Attempts": String(speech.attempts),
      },
    });
  } catch (e) {
    if (e instanceof InworldError) {
      // 4xx from Inworld is a bad request on our side; anything else is upstream.
      const status = e.status && e.status >= 400 && e.status < 500 ? 400 : 502;
      return NextResponse.json({ error: e.message }, { status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "voice-over failed" },
      { status: 500 }
    );
  }
}
