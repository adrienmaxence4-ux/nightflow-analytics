/**
 * Generates Instagram-ready promo visuals (Cyber Tokyo Night identity) into
 * the user's Downloads folder. Run: node scripts/generate-promo.mjs
 *  - nightflow-pub-1.png : 1080×1080 (post carré)
 *  - nightflow-pub-2.png : 1080×1350 (post portrait 4:5)
 */
import sharp from "sharp";

const OUT = "C:/Users/adrie/Downloads";
const F = "'Segoe UI', Arial, sans-serif";

const stars = (w, h, n, seed = 7) => {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const x = (rnd() * w).toFixed(0);
    const y = (rnd() * h).toFixed(0);
    const r = (0.8 + rnd() * 1.8).toFixed(1);
    const o = (0.25 + rnd() * 0.55).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }).join("");
};

const defs = `
  <defs>
    <radialGradient id="bg1" cx="0.15" cy="0.05" r="1"><stop offset="0" stop-color="#1b1440" stop-opacity="0.9"/><stop offset="1" stop-color="#070B1A"/></radialGradient>
    <radialGradient id="bg2" cx="0.9" cy="1" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.14"/><stop offset="1" stop-color="#070B1A" stop-opacity="0"/></radialGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="0.55" stop-color="#9a6bff"/><stop offset="1" stop-color="#ff5cae"/></linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="1" stop-color="#7dd8ff"/></linearGradient>
  </defs>`;

const logo = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#neon)" stroke-width="${r * 0.16}"/>
  <mask id="m${cx}"><rect x="0" y="0" width="2000" height="2000" fill="black"/>
    <circle cx="${cx - r * 0.06}" cy="${cy + r * 0.04}" r="${r * 0.58}" fill="white"/>
    <circle cx="${cx + r * 0.24}" cy="${cy - r * 0.14}" r="${r * 0.52}" fill="black"/></mask>
  <rect x="0" y="0" width="2000" height="2000" fill="#fff" mask="url(#m${cx})"/>`;

const alertCard = (x, y, w, tone, tag, title, action) => `
  <rect x="${x}" y="${y}" width="${w}" height="150" rx="22" fill="${tone}12" stroke="${tone}66" stroke-width="2"/>
  <text x="${x + 34}" y="${y + 44}" font-family="${F}" font-size="21" font-weight="800" letter-spacing="2" fill="${tone}">${tag}</text>
  <text x="${x + 34}" y="${y + 84}" font-family="${F}" font-size="28" font-weight="700" fill="#ffffff">${title}</text>
  <text x="${x + 34}" y="${y + 122}" font-family="${F}" font-size="23" fill="#c9d2f0">${action}</text>`;

// ── Visuel 1 : carré 1080×1080 ──
const sq = `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
${defs}
<rect width="1080" height="1080" fill="url(#bg1)"/><rect width="1080" height="1080" fill="url(#bg2)"/>
${stars(1080, 1080, 34)}
${logo(540, 150, 62)}
<text x="540" y="268" text-anchor="middle" font-family="${F}" font-size="26" font-weight="800" letter-spacing="6" fill="#8fd8ff">NIGHTFLOW ANALYTICS</text>
<text x="540" y="392" text-anchor="middle" font-family="${F}" font-size="76" font-weight="800" fill="#ffffff">Arrête de fixer</text>
<text x="540" y="478" text-anchor="middle" font-family="${F}" font-size="76" font-weight="800" fill="#ffffff">des chiffres.</text>
<text x="540" y="576" text-anchor="middle" font-family="${F}" font-size="80" font-weight="800" fill="url(#neon)">Sache quoi faire.</text>
<text x="540" y="646" text-anchor="middle" font-family="${F}" font-size="30" fill="#aeb8dd">L'IA qui lit les chiffres de ta boutique et te dit quoi faire.</text>
${alertCard(100, 700, 880, "#ff5cae", "RISQUE DÉTECTÉ", "Rupture de stock dans ~4 jours", "→ Recommande 60 unités — €1 600/sem de CA en jeu")}
<rect x="240" y="920" width="600" height="84" rx="42" fill="url(#cta)"/>
<text x="540" y="974" text-anchor="middle" font-family="${F}" font-size="32" font-weight="800" fill="#0a0f22">Essai gratuit, sans carte</text>
<text x="540" y="1046" text-anchor="middle" font-family="${F}" font-size="27" font-weight="600" fill="#8fd8ff">nightflow-analytics.vercel.app</text>
</svg>`;

// ── Visuel 2 : portrait 1080×1350 ──
const pt = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
${defs}
<rect width="1080" height="1350" fill="url(#bg1)"/><rect width="1080" height="1350" fill="url(#bg2)"/>
${stars(1080, 1350, 42, 13)}
${logo(540, 140, 58)}
<text x="540" y="252" text-anchor="middle" font-family="${F}" font-size="24" font-weight="800" letter-spacing="6" fill="#8fd8ff">NIGHTFLOW ANALYTICS</text>
<text x="540" y="352" text-anchor="middle" font-family="${F}" font-size="62" font-weight="800" fill="#ffffff">Ta boutique te parle.</text>
<text x="540" y="432" text-anchor="middle" font-family="${F}" font-size="62" font-weight="800" fill="url(#neon)">Tu l'écoutes ?</text>
<text x="540" y="500" text-anchor="middle" font-family="${F}" font-size="29" fill="#aeb8dd">Connecte Shopify, Wix ou WooCommerce en 1 clic.</text>
${alertCard(100, 560, 880, "#ff5cae", "ALERTE STOCK", "Rupture dans ~4 jours", "→ Recommande 60 unités maintenant")}
${alertCard(100, 742, 880, "#ffcc66", "PUB DÉFICITAIRE", "Meta Ads : ROAS 0,8 — tu perds de l'argent", "→ Réalloue le budget vers Google Ads (4,3)")}
${alertCard(100, 924, 880, "#7dffb0", "OPPORTUNITÉ", "Klaviyo : ROAS 19 — sous-investi", "→ +€2 500/sem possibles sur l'email")}
<rect x="240" y="1136" width="600" height="84" rx="42" fill="url(#cta)"/>
<text x="540" y="1190" text-anchor="middle" font-family="${F}" font-size="32" font-weight="800" fill="#0a0f22">Essai gratuit, sans carte</text>
<text x="540" y="1268" text-anchor="middle" font-family="${F}" font-size="27" font-weight="600" fill="#8fd8ff">nightflow-analytics.vercel.app</text>
</svg>`;

await sharp(Buffer.from(sq)).png().toFile(`${OUT}/nightflow-pub-1.png`);
console.log("✓ nightflow-pub-1.png (1080×1080)");
await sharp(Buffer.from(pt)).png().toFile(`${OUT}/nightflow-pub-2.png`);
console.log("✓ nightflow-pub-2.png (1080×1350)");
