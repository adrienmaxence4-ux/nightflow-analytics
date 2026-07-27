/**
 * Pub n°5 — « LA NOTIFICATION DU MATIN » (Cyber Tokyo Night).
 * 1080×1920, ~15 s. Visuellement très différente des autres : au lieu de texte
 * centré, on simule un écran de verrouillage de téléphone où une notification
 * Nightflow arrive à 8h00, puis s'ouvre sur l'insight. Format « natif » que
 * l'œil ne prend pas pour une pub — c'est ce qui arrête le défilement.
 *
 * Run: node scripts/generate-video5.mjs
 * Output: Downloads/nightflow-video-5.mp4  (ou $ADS_OUT_DIR)
 */
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const OUT_DIR = process.env.ADS_OUT_DIR ?? "C:/Users/adrie/Downloads";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/nightflow-video-5.mp4`;
const TMP = "scripts/.frames5";
const W = 1080, H = 1920, FPS = 30, DUR = 15;
const F = "'Segoe UI', Arial, sans-serif";
const run = promisify(execFile);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const prog = (t, s, d = 0.5) => easeOut(clamp((t - s) / d, 0, 1));
const env = (t, i, o = null) => {
  const a = prog(t, i, 0.4);
  const b = o == null ? 1 : 1 - prog(t, o, 0.4);
  return clamp(Math.min(a, b), 0, 1);
};

let sd = 13;
const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const STARS = Array.from({ length: 55 }, () => ({
  x: (rnd() * W).toFixed(0), y: (rnd() * H).toFixed(0),
  r: (0.7 + rnd() * 1.6).toFixed(1), o: (0.15 + rnd() * 0.4).toFixed(2),
}));
const starsSvg = STARS.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fff" opacity="${p.o}"/>`).join("");

const defs = `<defs>
  <radialGradient id="bg1" cx="0.25" cy="0.1" r="1.1"><stop offset="0" stop-color="#241a52"/><stop offset="1" stop-color="#05070f"/></radialGradient>
  <radialGradient id="bg2" cx="0.8" cy="0.9" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.14"/><stop offset="1" stop-color="#05070f" stop-opacity="0"/></radialGradient>
  <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="0.55" stop-color="#9a6bff"/><stop offset="1" stop-color="#ff5cae"/></linearGradient>
  <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="1" stop-color="#7dd8ff"/></linearGradient></defs>`;

const logo = (cx, cy, r, op = 1) => {
  const id = `ml${Math.round(cy)}${Math.round(cx)}`;
  return op <= 0.001 ? "" : `<g opacity="${op}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#neon)" stroke-width="${r * 0.18}"/>
  <mask id="${id}"><rect width="${W}" height="${H}" fill="black"/>
    <circle cx="${cx - r * 0.06}" cy="${cy + r * 0.04}" r="${r * 0.58}" fill="white"/>
    <circle cx="${cx + r * 0.24}" cy="${cy - r * 0.14}" r="${r * 0.52}" fill="black"/></mask>
  <rect width="${W}" height="${H}" fill="#fff" mask="url(#${id})"/></g>`;
};
const txt = (x, y, size, weight, fill, str, op, anchor = "middle") =>
  op <= 0.001 ? "" :
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${op.toFixed(3)}">${str}</text>`;

const ctaBio = (t, inT, y) => {
  const op = env(t, inT);
  if (op <= 0.001) return "";
  const bounce = Math.sin(t * 4) * 8;
  return `<g opacity="${op.toFixed(3)}">
    <text x="540" y="${y}" text-anchor="middle" font-family="${F}" font-size="34" font-weight="700" fill="#c9d2f0">Essai 30 jours — sans carte</text>
    <g transform="translate(540 ${(y + 78 + bounce).toFixed(1)})">
      <path d="M0,-30 L26,6 L13,6 L13,30 L-13,30 L-13,6 L-26,6 Z" fill="url(#cta)"/>
    </g>
    <text x="540" y="${y + 188}" text-anchor="middle" font-family="${F}" font-size="48" font-weight="800" letter-spacing="3" fill="url(#neon)">LIEN EN BIO</text>
    <text x="540" y="${y + 238}" text-anchor="middle" font-family="${F}" font-size="26" font-weight="600" fill="#8fd8ff">nightflow-analytics.vercel.app</text>
  </g>`;
};

function frameSvg(t) {
  let g = "";

  // ── Écran de verrouillage (0–10 s) ──
  const lockOut = 10.2;
  const lock = env(t, 0.1, lockOut);
  g += txt(540, 400, 150, 300, "#ffffff", "8:00", lock);
  g += txt(540, 470, 34, 500, "#aeb8dd", "mardi 8 juillet", lock);

  // ── Notification qui glisse (1.2 s) ──
  const nIn = 1.2;
  const nOp = env(t, nIn, lockOut);
  if (nOp > 0.001) {
    const slide = (1 - prog(t, nIn, 0.55)) * -140; // arrive du haut
    const x = 70, y = 640 + slide, w = 940;
    // La carte grandit quand la notif « s'ouvre » (à 4,2 s)
    const openP = prog(t, 4.2, 0.6);
    const h = 250 + openP * 300;
    g += `<g opacity="${nOp.toFixed(3)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="42" fill="#12183aE6" stroke="#ffffff1f" stroke-width="2"/>
      ${logo(x + 78, y + 76, 34, nOp)}
      <text x="${x + 128}" y="${y + 70}" font-family="${F}" font-size="30" font-weight="800" fill="#ffffff">Nightflow</text>
      <text x="${x + 128}" y="${y + 108}" font-family="${F}" font-size="24" fill="#8b93b8">maintenant</text>
      <text x="${x + w - 40}" y="${y + 70}" text-anchor="end" font-family="${F}" font-size="24" fill="#8b93b8">8:00</text>
      <text x="${x + 44}" y="${y + 178}" font-family="${F}" font-size="38" font-weight="700" fill="#ffffff">Ton point du matin est prêt ☕</text>`;
    // Contenu révélé à l'ouverture
    if (openP > 0.02) {
      const o = openP.toFixed(3);
      g += `<g opacity="${o}">
        <line x1="${x + 44}" y1="${y + 224}" x2="${x + w - 44}" y2="${y + 224}" stroke="#ffffff18" stroke-width="2"/>
        <text x="${x + 44}" y="${y + 288}" font-family="${F}" font-size="32" font-weight="700" fill="#ff8fcb">⚠ Stock bas — Sérum Éclat</text>
        <text x="${x + 44}" y="${y + 340}" font-family="${F}" font-size="29" fill="#e6ecff">Rupture dans 4 jours → recommande 60 unités.</text>
        <text x="${x + 44}" y="${y + 412}" font-family="${F}" font-size="32" font-weight="700" fill="#ffcc66">⚠ Meta Ads — ROAS 0,8</text>
        <text x="${x + 44}" y="${y + 464}" font-family="${F}" font-size="29" fill="#e6ecff">Tu perds 40 €/jour → bascule sur Google.</text>
        <text x="${x + 44}" y="${y + 524}" font-family="${F}" font-size="27" font-style="italic" fill="#7dffb0">Lu en 30 secondes.</text>
      </g>`;
    }
    g += `</g>`;
  }

  // Légende bas d'écran pendant la scène téléphone
  g += txt(540, 1560, 36, 700, "#c9d2f0", "Chaque matin. Sans rien demander.", env(t, 6.6, lockOut));

  // ── Bénéfice (10,4–12,4 s) ──
  g += txt(540, 760, 54, 800, "#ffffff", "Tu ouvres. Tu lis.", env(t, 10.5, 12.6));
  g += txt(540, 840, 58, 800, "url(#neon)", "Tu sais quoi faire.", env(t, 10.8, 12.6));
  g += txt(540, 960, 32, 600, "#aeb8dd", "Pas de tableau de bord à décrypter.", env(t, 11.3, 12.6));

  // ── Fin (12,7 s) ──
  const dIn = 12.7;
  g += `<g transform="translate(540,480) scale(${(0.9 + 0.1 * prog(t, dIn, 0.5)).toFixed(3)}) translate(-540,-480)">${logo(540, 480, 76, env(t, dIn))}</g>`;
  g += txt(540, 640, 30, 800, "#8fd8ff", "NIGHTFLOW ANALYTICS", env(t, dIn + 0.15));
  g += txt(540, 740, 46, 800, "#ffffff", "Ta boutique, en une notif.", env(t, dIn + 0.3));
  g += ctaBio(t, dIn + 0.5, 860);

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
