/**
 * AI-generated video ad n°4 — PROBLEM → SOLUTION → PAYOFF (Cyber Tokyo Night).
 * Vertical 1080×1920, ~16s, 30fps. Gives the CONTEXT the product-demo lacked:
 * the concrete pains an e-commerce owner faces (red ✗), then Nightflow as the
 * answer (green plan), then the two payoffs Adrien named — gagner du temps +
 * gagner de l'argent — then CTA. Problem-agitate-solve, captions for sound-off.
 *
 * Run: node scripts/generate-video4.mjs
 * Output: C:/Users/adrie/Downloads/nightflow-video-4.mp4
 */
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const OUT_DIR = process.env.ADS_OUT_DIR ?? "C:/Users/adrie/Downloads";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/nightflow-video-4.mp4`;
const TMP = "scripts/.frames4";
const W = 1080, H = 1920, FPS = 30, DUR = 16;
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

let s = 21;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const STARS = Array.from({ length: 60 }, () => ({
  x: (rnd() * W).toFixed(0), y: (rnd() * H).toFixed(0),
  r: (0.7 + rnd() * 1.7).toFixed(1), o: (0.15 + rnd() * 0.42).toFixed(2),
}));
const starsSvg = STARS.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fff" opacity="${p.o}"/>`).join("");

const defs = `<defs>
  <radialGradient id="bg1" cx="0.2" cy="0.05" r="1.1"><stop offset="0" stop-color="#1b1440"/><stop offset="1" stop-color="#070B1A"/></radialGradient>
  <radialGradient id="bg2" cx="0.85" cy="0.95" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.12"/><stop offset="1" stop-color="#070B1A" stop-opacity="0"/></radialGradient>
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
const txt = (x, y, size, weight, fill, str, op, anchor = "middle") =>
  op <= 0.001 ? "" :
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${op.toFixed(3)}">${str}</text>`;

// a pain row: red ✗ + text, slides in from the left
const painRow = (y, str, op, slide) => {
  if (op <= 0.001) return "";
  const x = 150 + slide;
  return `<g opacity="${op.toFixed(3)}">
    <circle cx="${x + 26}" cy="${y - 11}" r="26" fill="#ff5c7222" stroke="#ff5c72" stroke-width="2.5"/>
    <text x="${x + 26}" y="${y - 1}" text-anchor="middle" font-family="${F}" font-size="30" font-weight="800" fill="#ff5c72">✕</text>
    <text x="${x + 74}" y="${y} " font-family="${F}" font-size="36" font-weight="700" fill="#e6ecff">${str}</text></g>`;
};

const PAINS = [
  { in: 2.8, y: 800, s: "Des heures perdues dans les chiffres" },
  { in: 3.6, y: 920, s: "Des ruptures de stock qui coûtent cher" },
  { in: 4.4, y: 1040, s: "Du budget pub gaspillé" },
  { in: 5.2, y: 1160, s: "« Bon… je fais quoi maintenant ? »" },
];

function frameSvg(t) {
  let g = "";

  // ── Scene A + B : the problem (0–7s) ──
  const bOut = 6.9;
  g += txt(540, 560, 52, 800, "#ffffff", "Gérer une boutique en ligne,", env(t, 0.2, bOut));
  g += txt(540, 640, 58, 800, "url(#neon)", "c'est un casse-tête.", env(t, 0.8, bOut));
  for (const p of PAINS) {
    const e = env(t, p.in, bOut);
    const slide = (1 - prog(t, p.in, 0.5)) * 90;
    g += painRow(p.y, p.s, e, slide);
  }

  // ── Scene C : the answer + product glimpse (7.2–11s) ──
  const cIn = 7.2, cOut = 11.0;
  const lScale = 0.85 + 0.15 * prog(t, cIn, 0.6);
  g += `<g transform="translate(540,360) scale(${lScale.toFixed(3)}) translate(-540,-360)">${logo(540, 360, 74, env(t, cIn, cOut))}</g>`;
  g += txt(540, 520, 40, 800, "#8fd8ff", "NIGHTFLOW", env(t, cIn + 0.1, cOut));
  g += txt(540, 620, 56, 800, "#ffffff", "règle tout ça pour toi.", env(t, cIn + 0.3, cOut));
  // compact product glimpse (the day's plan)
  const card = env(t, cIn + 0.6, cOut);
  if (card > 0.001) {
    const y0 = 720;
    g += `<g opacity="${card.toFixed(3)}">
      <rect x="120" y="${y0}" width="840" height="300" rx="26" fill="#3df2ff10" stroke="url(#neon)" stroke-width="2.5"/>
      <text x="164" y="${y0 + 58}" font-family="${F}" font-size="24" font-weight="800" letter-spacing="1.5" fill="#8fd8ff">💡 TON PLAN DU JOUR</text>
      <text x="164" y="${y0 + 120}" font-family="${F}" font-size="30" font-weight="700" fill="#fff">✓ Recommande 60 unités (stock bas)</text>
      <text x="164" y="${y0 + 178}" font-family="${F}" font-size="30" font-weight="700" fill="#fff">✓ Coupe la pub Meta qui perd</text>
      <text x="164" y="${y0 + 236}" font-family="${F}" font-size="30" font-weight="700" fill="#fff">✓ Pousse le Sérum Éclat (58 % du CA)</text></g>`;
  }

  // ── Scene D : the payoff (11.2–16s) ──
  const dIn = 11.2;
  g += txt(540, 300, 34, 700, "#aeb8dd", "Résultat, chaque jour :", env(t, dIn));
  // benefit 1 — time
  const b1 = env(t, dIn + 0.2);
  if (b1 > 0.001) {
    g += `<g opacity="${b1.toFixed(3)}">
      <rect x="130" y="380" width="820" height="180" rx="24" fill="#3df2ff10" stroke="#3df2ff44" stroke-width="2"/>
      <g stroke-linecap="round">
        <rect x="222" y="416" width="16" height="12" rx="3" fill="#3df2ff"/>
        <circle cx="230" cy="472" r="40" fill="none" stroke="#3df2ff" stroke-width="6"/>
        <line x1="230" y1="472" x2="230" y2="446" stroke="#3df2ff" stroke-width="6"/>
        <line x1="230" y1="472" x2="252" y2="478" stroke="#3df2ff" stroke-width="6"/>
        <circle cx="230" cy="472" r="5" fill="#3df2ff"/>
      </g>
      <text x="320" y="460" font-family="${F}" font-size="42" font-weight="800" fill="#fff">Tu gagnes du temps</text>
      <text x="320" y="510" font-family="${F}" font-size="27" fill="#c9d2f0">30 secondes/jour au lieu de 3 heures</text></g>`;
  }
  // benefit 2 — money
  const b2 = env(t, dIn + 0.5);
  if (b2 > 0.001) {
    g += `<g opacity="${b2.toFixed(3)}">
      <rect x="130" y="590" width="820" height="180" rx="24" fill="#7dffb010" stroke="#7dffb055" stroke-width="2"/>
      <circle cx="230" cy="680" r="40" fill="#7dffb01f" stroke="#7dffb0" stroke-width="6"/>
      <text x="230" y="697" text-anchor="middle" font-family="${F}" font-size="46" font-weight="800" fill="#7dffb0">€</text>
      <text x="320" y="670" font-family="${F}" font-size="42" font-weight="800" fill="#fff">Tu gagnes de l'argent</text>
      <text x="320" y="720" font-family="${F}" font-size="27" fill="#c9d2f0">moins de pertes, plus de ventes</text></g>`;
  }
  // CTA
  const pulse = 1 + 0.03 * Math.sin(t * 6), cw = 700 * pulse, cyB = 880;
  const dop = env(t, dIn + 0.9);
  if (dop > 0.001)
    g += `<g opacity="${dop.toFixed(3)}"><rect x="${540 - cw / 2}" y="${cyB}" width="${cw}" height="98" rx="49" fill="url(#cta)"/>
      <text x="540" y="${cyB + 63}" text-anchor="middle" font-family="${F}" font-size="34" font-weight="800" fill="#0a0f22">Essai 30 jours — sans carte</text></g>`;
  g += txt(540, 1050, 30, 700, "#8fd8ff", "nightflow-analytics.vercel.app", env(t, dIn + 1.1));

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
