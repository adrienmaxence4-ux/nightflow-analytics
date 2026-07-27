/**
 * AI-generated video ad n°3 — PRODUCT DEMO (Cyber Tokyo Night).
 * Vertical 1080×1920, ~16s, 30fps. Shows the ACTUAL Nightflow app in a phone
 * mockup so viewers clearly SEE and understand the product: a dashboard where
 * KPIs populate, a mini chart grows, and the AI insight types itself in plain
 * French — then the recommendation + CTA. Built from 2026 SaaS demo research:
 * show the UI, lead with the concrete result, captions for sound-off, clear CTA.
 *
 * Run: node scripts/generate-video3.mjs
 * Output: C:/Users/adrie/Downloads/nightflow-video-3.mp4
 */
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { promisify } from "node:util";

const OUT_DIR = process.env.ADS_OUT_DIR ?? "C:/Users/adrie/Downloads";
mkdirSync(OUT_DIR, { recursive: true });
const OUT = `${OUT_DIR}/nightflow-video-3.mp4`;
const TMP = "scripts/.frames3";
const W = 1080, H = 1920, FPS = 30, DUR = 16;
const F = "'Segoe UI', Arial, sans-serif";
const run = promisify(execFile);

// ── helpers ──
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const prog = (t, start, dur = 0.5) => easeOut(clamp((t - start) / dur, 0, 1));
const env = (t, inT, outT = null) => {
  const i = prog(t, inT, 0.4);
  const o = outT == null ? 1 : 1 - prog(t, outT, 0.4);
  return clamp(Math.min(i, o), 0, 1);
};
const fr = (n) => Math.round(n).toLocaleString("fr-FR");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

let s = 7;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const STARS = Array.from({ length: 60 }, () => ({
  x: (rnd() * W).toFixed(0), y: (rnd() * H).toFixed(0),
  r: (0.7 + rnd() * 1.7).toFixed(1), o: (0.15 + rnd() * 0.4).toFixed(2),
}));
const starsSvg = STARS.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#fff" opacity="${p.o}"/>`).join("");

const defs = `<defs>
  <radialGradient id="bg1" cx="0.2" cy="0.05" r="1.1"><stop offset="0" stop-color="#1b1440"/><stop offset="1" stop-color="#070B1A"/></radialGradient>
  <radialGradient id="bg2" cx="0.85" cy="0.95" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.12"/><stop offset="1" stop-color="#070B1A" stop-opacity="0"/></radialGradient>
  <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="0.55" stop-color="#9a6bff"/><stop offset="1" stop-color="#ff5cae"/></linearGradient>
  <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="1" stop-color="#7dd8ff"/></linearGradient>
  <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1130"/><stop offset="1" stop-color="#0a0e24"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.5"/><stop offset="1" stop-color="#3df2ff"/></linearGradient></defs>`;

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

// ── phone geometry ──
const PW = 640, PH = 1300, PX = (W - PW) / 2, PY = 356;
const SX = PX + 16, SY = PY + 16, SW = PW - 32; // screen box

// KPI targets + 7-day chart
const KPIS = [
  { label: "CA aujourd'hui", val: 2847, suffix: " €" },
  { label: "Commandes", val: 63, suffix: "" },
  { label: "Panier moyen", val: 45, suffix: " €" },
];
const BARS = [42, 58, 50, 71, 63, 84, 110];

// AI insight, pre-wrapped to the card width; typed in progressively.
const INSIGHT = [
  "Sérum Éclat = 58 % de",
  "ton chiffre d'affaires.",
  "Stock bas → recommande",
  "60 unités avant vendredi.",
];
const INSIGHT_TOTAL = INSIGHT.join("").length;

function appScreen(t) {
  const shell = env(t, 0.2);
  const yRise = (1 - prog(t, 0.2, 1.0)) * 90; // phone slides up
  let g = `<g transform="translate(0 ${yRise.toFixed(1)})" opacity="${shell.toFixed(3)}">`;

  // phone shell + screen
  g += `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="56" fill="#05070f" stroke="#2a2f52" stroke-width="2.5"/>`;
  g += `<rect x="${SX}" y="${SY}" width="${SW}" height="${PH - 32}" rx="44" fill="url(#screen)"/>`;
  g += `<rect x="${W / 2 - 55}" y="${PY + 26}" width="110" height="9" rx="4.5" fill="#1a1f3d"/>`; // notch

  // header
  const hd = env(t, 1.0);
  g += `<g opacity="${hd.toFixed(3)}">`;
  g += logo(SX + 52, SY + 70, 26, hd);
  g += `<text x="${SX + 92}" y="${SY + 62}" font-family="${F}" font-size="26" font-weight="800" fill="#fff">Nightflow</text>`;
  g += `<text x="${SX + 92}" y="${SY + 92}" font-family="${F}" font-size="18" fill="#8b93b8">Mardi — mis à jour à 08:00</text>`;
  g += `</g>`;

  // ── AI insight card (hero) ──
  const cardTop = SY + 130;
  const cIn = env(t, 1.6);
  g += `<g opacity="${cIn.toFixed(3)}">
    <rect x="${SX + 24}" y="${cardTop}" width="${SW - 48}" height="330" rx="26" fill="#3df2ff10" stroke="url(#neon)" stroke-width="2.5"/>
    <text x="${SX + 56}" y="${cardTop + 52}" font-family="${F}" font-size="22" font-weight="800" letter-spacing="1.5" fill="#8fd8ff">💡 INSIGHT DU JOUR</text></g>`;
  // typed insight
  const typed = Math.floor(prog(t, 3.0, 4.0) * INSIGHT_TOTAL);
  let acc = 0;
  INSIGHT.forEach((line, i) => {
    const start = acc;
    acc += line.length;
    const shown = clamp(typed - start, 0, line.length);
    if (shown <= 0) return;
    const sub = line.slice(0, shown);
    const color = i >= 2 ? "#ffd27d" : "#ffffff";
    g += `<text x="${SX + 56}" y="${cardTop + 100 + i * 42}" font-family="${F}" font-size="30" font-weight="700" fill="${color}">${esc(sub)}</text>`;
  });
  // recommended pill (after typing)
  const pill = env(t, 7.4);
  if (pill > 0.001) {
    g += `<g opacity="${pill.toFixed(3)}">
      <rect x="${SX + 56}" y="${cardTop + 262}" width="230" height="46" rx="23" fill="#7dffb0" />
      <text x="${SX + 171}" y="${cardTop + 292}" text-anchor="middle" font-family="${F}" font-size="22" font-weight="800" fill="#08351f">✓ Action prête</text></g>`;
  }

  // ── KPI row (counting) ──
  const kTop = cardTop + 360;
  const kProg = prog(t, 1.9, 2.3);
  const cardW = (SW - 48 - 2 * 16) / 3;
  KPIS.forEach((k, i) => {
    const x = SX + 24 + i * (cardW + 16);
    const kIn = env(t, 1.8 + i * 0.12);
    const value = fr(k.val * kProg) + k.suffix;
    g += `<g opacity="${kIn.toFixed(3)}">
      <rect x="${x}" y="${kTop}" width="${cardW}" height="128" rx="20" fill="#ffffff08" stroke="#ffffff14" stroke-width="1.5"/>
      <text x="${x + cardW / 2}" y="${kTop + 42}" text-anchor="middle" font-family="${F}" font-size="16" fill="#8b93b8">${k.label}</text>
      <text x="${x + cardW / 2}" y="${kTop + 88}" text-anchor="middle" font-family="${F}" font-size="30" font-weight="800" fill="#fff">${value}</text>
      <text x="${x + cardW / 2}" y="${kTop + 114}" text-anchor="middle" font-family="${F}" font-size="15" font-weight="700" fill="#7dffb0">▲ ${8 + i * 3} %</text></g>`;
  });

  // ── mini chart (growing bars) ──
  const chTop = kTop + 156;
  const chIn = env(t, 2.2);
  g += `<g opacity="${chIn.toFixed(3)}">
    <rect x="${SX + 24}" y="${chTop}" width="${SW - 48}" height="240" rx="22" fill="#ffffff06" stroke="#ffffff10" stroke-width="1.5"/>
    <text x="${SX + 56}" y="${chTop + 44}" font-family="${F}" font-size="20" font-weight="700" fill="#c9d2f0">Ventes — 7 derniers jours</text>`;
  const cA = SX + 56, cW = SW - 48 - 64, base = chTop + 200, maxH = 120;
  const bw = cW / BARS.length - 14;
  const grow = prog(t, 2.4, 1.8);
  BARS.forEach((b, i) => {
    const hgt = (b / 110) * maxH * grow;
    const x = cA + i * (bw + 14);
    g += `<rect x="${x}" y="${base - hgt}" width="${bw}" height="${hgt}" rx="6" fill="url(#bar)"/>`;
  });
  g += `</g>`; // close chart card

  // ── recommendation row (the AI tells you what to do) ──
  const rTop = chTop + 264;
  const rIn = env(t, 3.6);
  g += `<g opacity="${rIn.toFixed(3)}">
    <rect x="${SX + 24}" y="${rTop}" width="${SW - 48}" height="92" rx="20" fill="#9a6bff12" stroke="#9a6bff33" stroke-width="1.5"/>
    <text x="${SX + 56}" y="${rTop + 40}" font-family="${F}" font-size="22" font-weight="700" fill="#fff">📦 Recommander 60 unités</text>
    <text x="${SX + 56}" y="${rTop + 70}" font-family="${F}" font-size="18" fill="#8b93b8">Sérum Éclat — avant vendredi</text>
    <rect x="${SX + SW - 48 - 92}" y="${rTop + 26}" width="80" height="40" rx="20" fill="url(#cta)"/>
    <text x="${SX + SW - 48 - 52}" y="${rTop + 52}" text-anchor="middle" font-family="${F}" font-size="18" font-weight="800" fill="#0a0f22">Faire</text></g>`;

  // ── bottom nav bar (makes it read as a real app) ──
  const navY = SY + (PH - 32) - 96;
  const navIn = env(t, 1.2);
  const tabs = ["Accueil", "Ventes", "IA", "Réglages"];
  g += `<g opacity="${navIn.toFixed(3)}">
    <line x1="${SX + 20}" y1="${navY}" x2="${SX + SW - 20}" y2="${navY}" stroke="#ffffff12" stroke-width="1.5"/>`;
  tabs.forEach((tb, i) => {
    const x = SX + (SW * (i + 0.5)) / 4;
    const active = i === 0;
    g += `<circle cx="${x}" cy="${navY + 36}" r="6" fill="${active ? "#3df2ff" : "#4a5378"}"/>
      <text x="${x}" y="${navY + 70}" text-anchor="middle" font-family="${F}" font-size="16" font-weight="${active ? 700 : 400}" fill="${active ? "#3df2ff" : "#6b7499"}">${tb}</text>`;
  });
  g += `</g>`;

  g += `</g>`; // close phone/shell group
  return g;
}

/** Fin de pub : pas de faux bouton — on dit où aller (cf. generate-video.mjs). */
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
  // top caption (above phone)
  g += txt(W / 2, 250, 40, 800, "#ffffff", "Ce que ta boutique te dit", env(t, 0.3, 11.4));
  g += txt(W / 2, 306, 40, 800, "url(#neon)", "chaque matin 👇", env(t, 0.5, 11.4));

  g += appScreen(t);

  // ── CTA overlay (Scene D) ──
  const dIn = 11.8;
  const veil = env(t, dIn) * 0.82;
  if (veil > 0.001) {
    g += `<rect width="${W}" height="${H}" fill="#070B1A" opacity="${veil.toFixed(3)}"/>`;
    g += `<g transform="translate(540,560) scale(${(0.9 + 0.1 * prog(t, dIn, 0.6)).toFixed(3)}) translate(-540,-560)">${logo(540, 560, 78, env(t, dIn))}</g>`;
    g += txt(W / 2, 720, 30, 800, "#8fd8ff", "NIGHTFLOW ANALYTICS", env(t, dIn + 0.15));
    g += txt(W / 2, 860, 52, 800, "#ffffff", "Connecte ta boutique.", env(t, dIn + 0.25));
    g += txt(W / 2, 928, 44, 700, "#c9d2f0", "L'IA fait le reste.", env(t, dIn + 0.45));
    g += ctaBio(t, dIn + 0.6, 1010);
  }

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
