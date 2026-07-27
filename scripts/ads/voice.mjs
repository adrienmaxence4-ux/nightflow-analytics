/**
 * Voix off française pour les pubs — synthèse vocale LOCALE (Windows SAPI,
 * voix « Microsoft Hortense »). Gratuite, hors ligne, aucune API.
 *
 * Windows uniquement : sur Linux (le cron GitHub) la génération est ignorée
 * proprement et la vidéo garde sa piste silencieuse.
 *
 *   import { synthesize, hasVoiceSupport } from "./voice.mjs";
 *   await synthesize("Bonjour", "C:/tmp/voix.wav");
 */
import { execFile } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Windows-only feature — the cron runs on Linux and must not fail. */
export function hasVoiceSupport() {
  return process.platform === "win32";
}

/**
 * Speaks `text` into a WAV file. `rate` is the SAPI speed (-10…10); a slightly
 * faster delivery suits short vertical ads. Returns false when unsupported.
 */
export async function synthesize(text, outWav, { rate = 1 } = {}) {
  if (!hasVoiceSupport()) return false;

  const dir = mkdtempSync(join(tmpdir(), "nf-voice-"));
  const ps1 = join(dir, "speak.ps1");
  const txt = join(dir, "line.txt");
  writeFileSync(txt, text, "utf8");

  // The text goes through a UTF-8 file so accents survive the shell.
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$text = [System.IO.File]::ReadAllText('${txt.replace(/\\/g, "\\\\")}', [System.Text.Encoding]::UTF8)
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fr = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'fr*' } | Select-Object -First 1
if ($fr) { $s.SelectVoice($fr.VoiceInfo.Name) }
$s.Rate = ${rate}
$s.SetOutputToWaveFile('${outWav.replace(/\\/g, "\\\\")}')
$s.Speak($text)
$s.Dispose()
`;
  writeFileSync(ps1, script, "utf8");

  try {
    await run("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy", "Bypass",
      "-File", ps1,
    ]);
    return existsSync(outWav);
  } catch (e) {
    console.warn(`    ⚠ voix indisponible : ${e.message}`);
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
