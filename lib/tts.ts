/**
 * Inworld TTS — French voice-over, server-side.
 *
 * Non-streaming endpoint (`/tts/v1/voice`): we want one finished audio file to
 * hand back, not low-latency playback. Inworld answers with base64 MP3, which
 * every browser plays natively — so the route passes it straight through.
 *
 * The ads pipeline has its own copy of this call in scripts/ads/voice.mjs: that
 * one runs in plain Node with a filesystem and an ElevenLabs/SAPI fallback
 * chain. This module is the cloud-runtime version — pure fetch, no fs — used by
 * /api/automation/tts, so it retries transient failures itself instead of
 * bubbling a one-off 5xx up to the routine.
 */
import { env } from "@/lib/env";

const ENDPOINT = "https://api.inworld.ai/tts/v1/voice";
const MODEL = "inworld-tts-2";
const ATTEMPT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;

export type InworldSpeech = {
  /** Raw MP3 bytes, base64-encoded (as Inworld returns them). */
  base64: string;
  mime: "audio/mpeg";
  bytes: number;
  voice: string;
  /** How many attempts it took (1 = first try). */
  attempts: number;
};

export class InworldError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "InworldError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 4xx (except 429) is our fault — a bad voice or malformed text — so retrying
 *  it just wastes time. Everything else (timeout, 429, 5xx) is worth another go. */
function isTransient(status?: number): boolean {
  if (status === undefined) return true; // network error / timeout
  if (status === 429) return true;
  return status >= 500;
}

async function attempt(text: string, voiceId: string, speakingRate: number) {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        // The key is already a base64 credential pair — passed verbatim.
        Authorization: `Basic ${env.inworldKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId,
        modelId: MODEL,
        audioConfig: { speakingRate },
        deliveryMode: "BALANCED",
        language: "fr-FR",
      }),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch (e) {
    throw new InworldError(
      `Inworld unreachable: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new InworldError(
      `Inworld ${res.status}: ${detail.slice(0, 200)}`,
      res.status
    );
  }

  const { audioContent } = (await res.json()) as { audioContent?: string };
  if (!audioContent) {
    throw new InworldError("Inworld response had no audioContent");
  }
  return audioContent;
}

/**
 * Speaks `text` in French with Inworld, retrying transient failures up to
 * `MAX_ATTEMPTS` times with a short backoff. Throws `InworldError` only when the
 * key is missing, the request is genuinely bad (4xx), or every attempt failed —
 * the caller maps that to a 4xx/5xx.
 */
export async function inworldTTS(
  text: string,
  { voice, speakingRate = 1 }: { voice?: string; speakingRate?: number } = {}
): Promise<InworldSpeech> {
  if (!env.inworldKey) {
    throw new InworldError("INWORLD_API_KEY is not configured");
  }
  const voiceId = voice?.trim() || env.inworldVoice;

  let lastErr: InworldError = new InworldError("Inworld: no attempt ran");
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      const audioContent = await attempt(text, voiceId, speakingRate);
      return {
        base64: audioContent,
        mime: "audio/mpeg",
        bytes: Math.floor((audioContent.length * 3) / 4),
        voice: voiceId,
        attempts: i,
      };
    } catch (e) {
      if (!(e instanceof InworldError)) throw e;
      lastErr = e;
      if (!isTransient(e.status) || i === MAX_ATTEMPTS) break;
      await sleep(400 * i); // 400ms, 800ms
    }
  }
  throw lastErr;
}
