/**
 * Voix off française pour les pubs. Chaîne de repli, du meilleur au dernier
 * recours — le premier fournisseur disponible qui rend un fichier gagne :
 *
 *  1. Inworld TTS (inworld-tts-2, voix FR native « Étienne ») si
 *     INWORLD_API_KEY est présente.
 *  2. ElevenLabs (qualité studio) si ELEVENLABS_API_KEY est présente.
 *  3. Sinon, repli sur la synthèse Windows locale (SAPI, « Hortense ») :
 *     gratuite et hors ligne, mais nettement plus robotique.
 *  4. Sinon (Linux/cron sans clé), aucune voix : piste silencieuse.
 *
 *  Les clés sont lues depuis .env.local, jamais commité.
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
/** The paid-plan notice is printed once per run, not once per ad. */
let warnedPaid = false;

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
  // Choix d'Adrien : « Eric - Dynamic and Energetic », voix FR conçue pour la
  // publicité. C'est une voix de BIBLIOTHÈQUE → refusée tant que le compte
  // ElevenLabs est gratuit ; on bascule alors automatiquement sur FALLBACK.
  ericfr: "qlfxsYlCv09qu8y6PkmY",
  // Voix natives ElevenLabs — toujours autorisées, même en gratuit.
  liam: "TX3LPaxmHKxFdv7VOQHJ", // jeune, énergique, "créateur réseaux sociaux"
  chris: "iP95p4xoKVk53GoZ742B", // naturel, décontracté
  will: "bIHbv24MWmeRgasZH58o", // posé, optimiste
  george: "JBFqnCBsd6RMkjVDRZzb", // grave, conteur captivant
  eric: "cjVigY5qzO86Huf0OWal", // doux, rassurant
};
export const DEFAULT_VOICE = "ericfr";
/** Utilisée quand la voix demandée exige un abonnement payant. */
export const FALLBACK_VOICE = "liam";

/** Voix Inworld par défaut — FR native, faite pour la narration. Override
 *  possible via INWORLD_VOICE dans .env.local. */
export const DEFAULT_INWORLD_VOICE = "Étienne";

/** Fournisseurs disponibles ici, du meilleur au dernier recours. */
function providerChain() {
  const chain = [];
  if (envLocal("INWORLD_API_KEY")) chain.push("inworld");
  if (envLocal("ELEVENLABS_API_KEY")) chain.push("elevenlabs");
  if (process.platform === "win32") chain.push("windows");
  return chain;
}

/** Le fournisseur préféré (celui qui sera tenté en premier), pour l'affichage. */
export function voiceProvider() {
  return providerChain()[0] ?? "none";
}

export function hasVoiceSupport() {
  return voiceProvider() !== "none";
}

/**
 * Inworld TTS → MP3. Mode non-streaming : on veut un fichier complet à muxer
 * avec ffmpeg, pas de la lecture basse latence. La clé API est déjà un couple
 * d'identifiants encodé en base64 → header `Authorization: Basic <clé>` tel quel.
 * Retourne { file } en cas de succès, null sinon (le caller enchaîne le repli).
 */
async function viaInworld(text, outBase, { rate = 1 } = {}) {
  const key = envLocal("INWORLD_API_KEY");
  const voiceId = envLocal("INWORLD_VOICE") || DEFAULT_INWORLD_VOICE;
  const out = `${outBase}.mp3`;
  try {
    const res = await fetch("https://api.inworld.ai/tts/v1/voice", {
      method: "POST",
      headers: {
        Authorization: `Basic ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId,
        modelId: "inworld-tts-2",
        audioConfig: { speakingRate: rate },
        deliveryMode: "BALANCED",
        language: "fr-FR",
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`    ⚠ Inworld ${res.status} : ${detail.slice(0, 200)}`);
      return null;
    }
    const { audioContent } = await res.json();
    if (!audioContent) {
      console.warn("    ⚠ Inworld : réponse sans audioContent");
      return null;
    }
    writeFileSync(out, Buffer.from(audioContent, "base64"));
    return existsSync(out) ? { file: out } : null;
  } catch (e) {
    console.warn(`    ⚠ Inworld injoignable : ${e.message}`);
    return null;
  }
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
      // 402 = library voice on a free plan. Signal it so the caller can retry
      // with a premade voice instead of silently producing a mute ad.
      if (res.status === 402) return { needsPaidPlan: true };
      console.warn(`    ⚠ ElevenLabs ${res.status} : ${detail.slice(0, 160)}`);
      return null;
    }
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    return existsSync(out) ? { file: out } : null;
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
  // On tente chaque fournisseur disponible dans l'ordre : un échec réseau /
  // quota d'Inworld ou d'ElevenLabs bascule sur le suivant plutôt que de
  // livrer une pub muette.
  for (const provider of providerChain()) {
    if (provider === "inworld") {
      const res = await viaInworld(text, outBase, { rate });
      if (res?.file) return res.file;
    }

    if (provider === "elevenlabs") {
      const picked = voice || envLocal("ADS_VOICE_NAME") || DEFAULT_VOICE;
      let res = await viaElevenLabs(text, outBase, VOICES[picked] ?? VOICES[DEFAULT_VOICE]);

      // The chosen voice needs a paid plan → use a premade one rather than
      // shipping a silent ad. Announced once so the reason is never a mystery.
      if (res?.needsPaidPlan) {
        if (!warnedPaid) {
          console.warn(
            `    ⚠ La voix « ${picked} » exige un abonnement ElevenLabs payant —\n` +
            `      repli automatique sur « ${FALLBACK_VOICE} » (voix native, gratuite).`
          );
          warnedPaid = true;
        }
        res = await viaElevenLabs(text, outBase, VOICES[FALLBACK_VOICE]);
      }
      if (res?.file) return res.file;
    }

    if (provider === "windows") {
      const f = await viaWindows(text, outBase, rate);
      if (f) return f;
    }
  }
  return null;
}
