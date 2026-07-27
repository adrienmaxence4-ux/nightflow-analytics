/**
 * Voix off française pour les pubs.
 *
 *  1. ElevenLabs (qualité studio) si ELEVENLABS_API_KEY est présente — la clé
 *     est lue depuis .env.local, qui est exclu de Git.
 *  2. Sinon, repli sur la synthèse Windows locale (SAPI, « Hortense ») :
 *     gratuite et hors ligne, mais nettement plus robotique.
 *  3. Sinon (Linux/cron), aucune voix : la vidéo garde sa piste silencieuse.
 *
 *   const f = await synthesize("Bonjour", "C:/tmp/voix");  // → chemin réel
 */
import { execFile } from "node:child_process";
import {
  mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Minimal .env.local reader — plain node scripts don't get Next.js's loader. */
function envLocal(key) {
  if (process.env[key]) return process.env[key];
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* no .env.local — fine */
  }
  return "";
}

/**
 * Voix utilisables. Le modèle `eleven_multilingual_v2` les fait parler
 * FRANÇAIS. On n'utilise que les voix natives ElevenLabs : les voix de la
 * bibliothèque (dont les françaises) sont refusées aux comptes gratuits
 * (402 paid_plan_required).
 */
export const VOICES = {
  liam: "TX3LPaxmHKxFdv7VOQHJ", // jeune, énergique, "créateur réseaux sociaux"
  chris: "iP95p4xoKVk53GoZ742B", // naturel, décontracté
  will: "bIHbv24MWmeRgasZH58o", // posé, optimiste
  george: "JBFqnCBsd6RMkjVDRZzb", // grave, conteur captivant
  eric: "cjVigY5qzO86Huf0OWal", // doux, rassurant
};
export const DEFAULT_VOICE = "liam";

export function voiceProvider() {
  if (envLocal("ELEVENLABS_API_KEY")) return "elevenlabs";
  return process.platform === "win32" ? "windows" : "none";
}

export function hasVoiceSupport() {
  return voiceProvider() !== "none";
}

/** ElevenLabs → MP3. Returns the written path, or null on failure. */
async function viaElevenLabs(text, outBase, voiceId) {
  const key = envLocal("ELEVENLABS_API_KEY");
  const out = `${outBase}.mp3`;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        // JSON.stringify + fetch send proper UTF-8, so accents survive.
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 },
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`    ⚠ ElevenLabs ${res.status} : ${detail.slice(0, 160)}`);
      return null;
    }
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    return existsSync(out) ? out : null;
  } catch (e) {
    console.warn(`    ⚠ ElevenLabs injoignable : ${e.message}`);
    return null;
  }
}

/** Windows SAPI → WAV. Returns the written path, or null. */
async function viaWindows(text, outBase, rate) {
  const out = `${outBase}.wav`;
  const dir = mkdtempSync(join(tmpdir(), "nf-voice-"));
  const ps1 = join(dir, "speak.ps1");
  const txt = join(dir, "line.txt");
  writeFileSync(txt, text, "utf8");
  const esc = (p) => p.replace(/\\/g, "\\\\");
  writeFileSync(
    ps1,
    `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$text = [System.IO.File]::ReadAllText('${esc(txt)}', [System.Text.Encoding]::UTF8)
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fr = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'fr*' } | Select-Object -First 1
if ($fr) { $s.SelectVoice($fr.VoiceInfo.Name) }
$s.Rate = ${rate}
$s.SetOutputToWaveFile('${esc(out)}')
$s.Speak($text)
$s.Dispose()
`,
    "utf8"
  );
  try {
    await run("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ps1,
    ]);
    return existsSync(out) ? out : null;
  } catch (e) {
    console.warn(`    ⚠ voix Windows indisponible : ${e.message}`);
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Speaks `text`. `outBase` is a path WITHOUT extension — the provider decides
 * the format. Returns the produced file path, or null when no voice is possible.
 */
export async function synthesize(text, outBase, { rate = 1, voice } = {}) {
  const provider = voiceProvider();
  if (provider === "elevenlabs") {
    const picked = voice ?? envLocal("ADS_VOICE_NAME") ?? DEFAULT_VOICE;
    const id = VOICES[picked] ?? VOICES[DEFAULT_VOICE];
    const file = await viaElevenLabs(text, outBase, id);
    if (file) return file;
    // ElevenLabs failed (quota, network…) → keep the ad usable on Windows.
    if (process.platform === "win32") return viaWindows(text, outBase, rate);
    return null;
  }
  if (provider === "windows") return viaWindows(text, outBase, rate);
  return null;
}
