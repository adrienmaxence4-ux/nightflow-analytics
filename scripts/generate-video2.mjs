/**
 * AI-generated video ad n°2 — FOUNDER STORY angle (Cyber Tokyo Night).
 * Vertical 1080×1920, ~15s, 30fps. Same engine as generate-video.mjs, different
 * storyboard: the non-copyable hook is Adrien's own story. Built for A/B testing
 * the hook rate against the problem-first ad (video-1).
 *
 * Run: node scripts/generate-video2.mjs
 * Output: C:/Users/adrie/Downloads/nightflow-video-2.mp4
 */
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const OUT = "C:/Users/adrie/Downloads/nightflow-video-2.mp4";
const TMP = "scripts/.frames2";
const W = 1080, H = 1920, FPS = 30, DUR = 15;
const F = "'Segoe UI', Arial, sans-serif";
const run = promisify(execFile);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const prog = (t, start, dur = 0.5) => easeOut(clamp((t - start) / dur, 0, 1));
const env = (t, inT, outT = null) => {
  const i = prog(t, inT, 0.4);
  const o = outT == null ? 1 : 1 - prog(t, outT, 0.4);
  return clamp(Math.min(i, o), 0, 1);
};

let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const STARS = Array.from({ length: 70 }, () => ({
  x: (rnd() * W).toFixed(0), y: (rnd() * H).toFixed(0),
  r: (0.8 + rnd() * 1.9).toFixed(1), o: (0.2 + rnd() * 0.5).toFixed(2),
}));
const starsSvg = STARS.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fff" opacity="${p.o}"/>`).join("");

const defs = `<defs>
  <radialGradient id="bg1" cx="0.2" cy="0.05" r="1.1"><stop offset="0" stop-color="#1b1440"/><stop offset="1" stop-color="#070B1A"/></radialGradient>
  <radialGradient id="bg2" cx="0.85" cy="0.95" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.13"/><stop offset="1" stop-color="#070B1A" stop-opacity="0"/></radialGradient>
  <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="0.55" stop-color="#9a6bff"/><stop offset="1" stop-color="#ff5cae"/></linearGradient>
  <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="1" stop-color="#7dd8ff"/></linearGradient></defs>`;

const logo = (cx, cy, r, op = 1) => {
  const id = `ml${Math.round(cy)}`;
  return op <= 0.001 ? "" : `<g opacity="${op}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#neon)" stroke-width="${r * 0.16}"/>
  <mask id="${id}"><rect width="${W}" height="${H}" fill="black"/>
    <circle cx="${cx - r * 0.06}" cy="${cy + r * 0.04}" r="${r * 0.58}" fill="white"/>
    <circle cx="${cx + r * 0.24}" cy="${cy - r * 0.14}" r="${r * 0.52}" fill="black"/></mask>
  <rect width="${W}" height="${H}" fill="#fff" mask="url(#${id})"/></g>`;
};

const txt = (x, y, size, weight, fill, str, op) =>
  op <= 0.001 ? "" :
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${op.toFixed(3)}">${str}</text>`;

function frameSvg(t) {
  let g = "";
  // ── Scene A : staccato identity hook (0–3.4s) ──
  const aOut = 3.4;
  g += txt(540, 780, 96, 800, "#ffffff", "17 ans.", env(t, 0.15, aOut));
  g += txt(540, 910, 72, 800, "#aeb8dd", "Terminale STI2D.", env(t, 0.85, aOut));
  g += txt(540, 1030, 72, 800, "url(#neon)", "Multidys. TDA.", env(t, 1.6, aOut));
  g += txt(540, 1150, 38, 600, "#8fd8ff", "Une seule obsession.", env(t, 2.4, aOut));

  // ── Scene B : the build (3.5–7.6s) ──
  const bIn = 3.5, bOut = 7.6;
  const lScale = 0.85 + 0.15 * prog(t, bIn, 0.6);
  g += `<g transform="translate(540,340) scale(${lScale.toFixed(3)}) translate(-540,-340)">${logo(540, 340, 92, env(t, bIn, bOut))}</g>`;
  g += txt(540, 700, 66, 800, "#ffffff", "J'ai construit l'IA", env(t, bIn + 0.3, bOut));
  g += txt(540, 800, 66, 800, "#ffffff", "qui lit tes chiffres", env(t, bIn + 0.55, bOut));
  g += txt(540, 910, 72, 800, "url(#neon)", "à ta place.", env(t, bIn + 0.85, bOut));

  // ── Scene C : the contrast (7.7–11.6s) ──
  const cIn = 7.7, cOut = 11.6;
  g += txt(540, 620, 40, 700, "#8090b8", "Avant : 12 graphiques.", env(t, cIn, cOut));
  g += txt(540, 700, 40, 700, "#8090b8", "Et aucune décision.", env(t, cIn + 0.3, cOut));
  const cardE = env(t, cIn + 1.0, cOut);
  const slide = (1 - prog(t, cIn + 1.0, 0.5)) * 120;
  if (cardE > 0.001) {
    const x = 90 + slide;
    g += `<g opacity="${cardE.toFixed(3)}">
      <rect x="${x}" y="900" width="900" height="240" rx="28" fill="#3df2ff10" stroke="#3df2ff66" stroke-width="2.5"/>
      <text x="${x + 44}" y="972" font-family="${F}" font-size="26" font-weight="800" letter-spacing="2" fill="#7dffb0">MAINTENANT</text>
      <text x="${x + 44}" y="1032" font-family="${F}" font-size="36" font-weight="700" fill="#fff">« Rupture dans 4 jours.</text>
      <text x="${x + 44}" y="1088" font-family="${F}" font-size="36" font-weight="700" fill="#fff">Recommande 60 unités. »</text></g>`;
  }
  g += txt(540, 1230, 34, 600, "#c9d2f0", "Une phrase. Pas un tableau de bord.", env(t, cIn + 1.6, cOut));

  // ── Scene D : CTA (12.1–15s) ──
  const dIn = 12.1;
  g += `<g transform="translate(540,540) scale(${(0.9 + 0.1 * prog(t, dIn, 0.6)).toFixed(3)}) translate(-540,-540)">${logo(540, 540, 84, env(t, dIn))}</g>`;
  g += txt(540, 750, 48, 800, "#ffffff", "Celle qui m'aurait aidé.", env(t, dIn + 0.2));
  g += txt(540, 820, 40, 600, "#aeb8dd", "Elle peut t'aider, toi.", env(t, dIn + 0.35));
  const pulse = 1 + 0.03 * Math.sin(t * 6);
  const cw = 660 * pulse, cyB = 930, dop = env(t, dIn + 0.5);
  if (dop > 0.001)
    g += `<g opacity="${dop.toFixed(3)}"><rect x="${540 - cw / 2}" y="${cyB}" width="${cw}" height="96" rx="48" fill="url(#cta)"/>
      <text x="540" y="${cyB + 62}" text-anchor="middle" font-family="${F}" font-size="36" font-weight="800" fill="#0a0f22">Teste-la gratuitement</text></g>`;
  g += txt(540, 1110, 30, 700, "#8fd8ff", "nightflow-analytics.vercel.app", env(t, dIn + 0.7));

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg1)"/><rect width="${W}" height="${H}" fill="url(#bg2)"/>
    ${starsSvg}${g}</svg>`;
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const total = FPS * DUR;
console.log(`Rendering ${total} frames…`);
for (let i = 0; i < total; i++) {
  await sharp(Buffer.from(frameSvg(i / FPS))).png().toFile(`${TMP}/f${String(i).padStart(4, "0")}.png`);
  if (i % 60 === 0) console.log(`  ${i}/${total}`);
}

console.log("Encoding MP4…");
await run(ffmpegPath, [
  "-y", "-framerate", String(FPS), "-i", `${TMP}/f%04d.png`,
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
  "-c:a", "aac", "-shortest", "-movflags", "+faststart", OUT,
]);
rmSync(TMP, { recursive: true, force: true });
console.log("✓ " + OUT);
