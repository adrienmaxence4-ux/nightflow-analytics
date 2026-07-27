/**
 * AI-generated Instagram/TikTok video ad (Cyber Tokyo Night).
 * Vertical 1080×1920, ~14s, 30fps, hook in the first 2s, fully readable with
 * sound off (kinetic captions) — built from the 2026 e-commerce ad research:
 * short vertical, 2-3s hook, sound-off, native feel. Renders frames with sharp
 * then encodes to MP4 (+ silent audio track for max IG/Reels compatibility).
 *
 * Run: node scripts/generate-video.mjs
 * Output: C:/Users/adrie/Downloads/nightflow-video-1.mp4
 */
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const OUT_DIR = process.env.ADS_OUT_DIR ?? "C:/Users/adrie/Downloads";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/nightflow-video-1.mp4`;
const TMP = "scripts/.frames";
const W = 1080, H = 1920, FPS = 30, DUR = 15;
const F = "'Segoe UI', Arial, sans-serif";
const run = promisify(execFile);

// ── anim helpers ──
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const prog = (t, start, dur = 0.5) => easeOut(clamp((t - start) / dur, 0, 1));
// envelope: fade-in at `inT`, optional fade-out at `outT`
const env = (t, inT, outT = null) => {
  const i = prog(t, inT, 0.45);
  const o = outT == null ? 1 : 1 - prog(t, outT, 0.4);
  return clamp(Math.min(i, o), 0, 1);
};

// fixed starfield
let s = 99;
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
  const id = `ml${Math.round(cy)}`; // unique per instance — avoid SVG mask id collision
  return op <= 0.001 ? "" : `<g opacity="${op}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#neon)" stroke-width="${r * 0.16}"/>
  <mask id="${id}"><rect width="${W}" height="${H}" fill="black"/>
    <circle cx="${cx - r * 0.06}" cy="${cy + r * 0.04}" r="${r * 0.58}" fill="white"/>
    <circle cx="${cx + r * 0.24}" cy="${cy - r * 0.14}" r="${r * 0.52}" fill="black"/></mask>
  <rect width="${W}" height="${H}" fill="#fff" mask="url(#${id})"/></g>`;
};

const txt = (x, y, size, weight, fill, str, op, anchor = "middle", dy = 0) =>
  op <= 0.001 ? "" :
  `<text x="${x}" y="${y + dy}" text-anchor="${anchor}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${op.toFixed(3)}">${str}</text>`;

const card = (y, op, slide, tone, tag, title, action) => {
  if (op <= 0.001) return "";
  const x = 90 + slide;
  return `<g opacity="${op.toFixed(3)}">
    <rect x="${x}" y="${y}" width="900" height="176" rx="26" fill="${tone}14" stroke="${tone}66" stroke-width="2.5"/>
    <text x="${x + 40}" y="${y + 52}" font-family="${F}" font-size="24" font-weight="800" letter-spacing="2" fill="${tone}">${tag}</text>
    <text x="${x + 40}" y="${y + 100}" font-family="${F}" font-size="33" font-weight="700" fill="#fff">${title}</text>
    <text x="${x + 40}" y="${y + 146}" font-family="${F}" font-size="26" fill="#c9d2f0">${action}</text></g>`;
};

function frameSvg(t) {
  let g = "";
  // ── Scene A : HOOK (0–3s) ──
  const aOut = 2.7;
  g += txt(540, 760, 84, 800, "#ffffff", "Ta boutique", env(t, 0.15, aOut));
  g += txt(540, 870, 92, 800, "url(#neon)", "perd de l'argent.", env(t, 0.5, aOut));
  g += txt(540, 1010, 40, 600, "#aeb8dd", "…et tu ne le vois même pas.", env(t, 1.5, aOut));

  // ── Scene B : reveal (2.6–5s) ──  (top logo/brand + cards clear before CTA)
  const bIn = 2.7, bOut = 11.5;
  const lScale = 0.85 + 0.15 * prog(t, bIn, 0.6);
  g += `<g transform="translate(540,300) scale(${lScale.toFixed(3)}) translate(-540,-300)">${logo(540, 300, 88, env(t, bIn, bOut))}</g>`;
  g += txt(540, 470, 28, 800, "#8fd8ff", "NIGHTFLOW ANALYTICS", env(t, bIn + 0.2, bOut));
  g += txt(540, 640, 62, 800, "#ffffff", "Nightflow le voit.", env(t, bIn + 0.35, 5.2));
  g += txt(540, 720, 66, 800, "url(#neon)", "À ta place.", env(t, bIn + 0.7, 5.2));

  // ── Scene C : alerts (5–12.8s) ──
  const cards = [
    { in: 5.0, y: 780, tone: "#ff5cae", tag: "RISQUE", ti: "Rupture de stock dans 4 jours", ac: "→ Recommande 60 unités" },
    { in: 6.6, y: 1000, tone: "#ffcc66", tag: "PUB", ti: "Meta Ads : ROAS 0,8 — tu perds", ac: "→ Réalloue vers Google (4,3)" },
    { in: 8.2, y: 1220, tone: "#7dffb0", tag: "OPPORTUNITÉ", ti: "Klaviyo sous-investi (ROAS 19)", ac: "→ +2 500 €/sem possibles" },
  ];
  for (const c of cards) {
    const e = env(t, c.in, bOut);
    const slide = (1 - prog(t, c.in, 0.5)) * 120;
    g += card(c.y, e, slide, c.tone, c.tag, c.ti, c.ac);
  }

  // ── Scene D : CTA (12.1–15s) ──
  const dIn = 12.1;
  g += `<g transform="translate(540,560) scale(${(0.9 + 0.1 * prog(t, dIn, 0.6)).toFixed(3)}) translate(-540,-560)">${logo(540, 560, 82, env(t, dIn))}</g>`;
  g += txt(540, 760, 52, 800, "#ffffff", "Ta boutique te parle enfin.", env(t, dIn + 0.2));
  const pulse = 1 + 0.03 * Math.sin(t * 6);
  const cx = 540, cw = 640 * pulse, cyB = 900;
  const dop = env(t, dIn + 0.4);
  if (dop > 0.001)
    g += `<g opacity="${dop.toFixed(3)}"><rect x="${cx - cw / 2}" y="${cyB}" width="${cw}" height="96" rx="48" fill="url(#cta)"/>
      <text x="${cx}" y="${cyB + 62}" text-anchor="middle" font-family="${F}" font-size="36" font-weight="800" fill="#0a0f22">Essai gratuit, sans carte</text></g>`;
  g += txt(540, 1080, 30, 700, "#8fd8ff", "nightflow-analytics.vercel.app", env(t, dIn + 0.6));

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg1)"/><rect width="${W}" height="${H}" fill="url(#bg2)"/>
    ${starsSvg}${g}</svg>`;
}

// ── render frames ──
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const total = FPS * DUR;
console.log(`Rendering ${total} frames…`);
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await sharp(Buffer.from(frameSvg(t))).png().toFile(`${TMP}/f${String(i).padStart(4, "0")}.png`);
  if (i % 60 === 0) console.log(`  ${i}/${total}`);
}

// ── encode MP4 (+ silent audio for IG compatibility) ──
console.log("Encoding MP4…");
await run(ffmpegPath, [
  "-y",
  "-framerate", String(FPS),
  "-i", `${TMP}/f%04d.png`,
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
  "-c:a", "aac", "-shortest", "-movflags", "+faststart",
  OUT,
]);
rmSync(TMP, { recursive: true, force: true });
console.log("✓ " + OUT);
