/**
 * More Instagram promo visuals (Cyber Tokyo Night). → Downloads folder.
 *  - nightflow-pub-3.png : 1080×1080  (hook "problème")
 *  - nightflow-pub-4.png : 1080×1350  (histoire du fondateur — angle fort)
 */
import sharp from "sharp";
const OUT = "C:/Users/adrie/Downloads";
const F = "'Segoe UI', Arial, sans-serif";

const stars = (w, h, n, seed = 7) => {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => {
    const x = (rnd() * w).toFixed(0), y = (rnd() * h).toFixed(0);
    return `<circle cx="${x}" cy="${y}" r="${(0.8 + rnd() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`;
  }).join("");
};
const defs = `<defs>
  <radialGradient id="bg1" cx="0.15" cy="0.05" r="1"><stop offset="0" stop-color="#1b1440" stop-opacity="0.9"/><stop offset="1" stop-color="#070B1A"/></radialGradient>
  <radialGradient id="bg2" cx="0.9" cy="1" r="0.9"><stop offset="0" stop-color="#3df2ff" stop-opacity="0.14"/><stop offset="1" stop-color="#070B1A" stop-opacity="0"/></radialGradient>
  <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="0.55" stop-color="#9a6bff"/><stop offset="1" stop-color="#ff5cae"/></linearGradient>
  <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3df2ff"/><stop offset="1" stop-color="#7dd8ff"/></linearGradient></defs>`;
const logo = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#neon)" stroke-width="${r * 0.16}"/>
  <mask id="m${cx}"><rect x="0" y="0" width="2000" height="2000" fill="black"/>
    <circle cx="${cx - r * 0.06}" cy="${cy + r * 0.04}" r="${r * 0.58}" fill="white"/>
    <circle cx="${cx + r * 0.24}" cy="${cy - r * 0.14}" r="${r * 0.52}" fill="black"/></mask>
  <rect x="0" y="0" width="2000" height="2000" fill="#fff" mask="url(#m${cx})"/>`;
const cta = (cx, y, w, txt) => `
  <rect x="${cx - w / 2}" y="${y}" width="${w}" height="84" rx="42" fill="url(#cta)"/>
  <text x="${cx}" y="${y + 54}" text-anchor="middle" font-family="${F}" font-size="32" font-weight="800" fill="#0a0f22">${txt}</text>`;

// ── pub-3 : hook problème (carré) ──
const p3 = `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">${defs}
<rect width="1080" height="1080" fill="url(#bg1)"/><rect width="1080" height="1080" fill="url(#bg2)"/>${stars(1080, 1080, 30, 3)}
${logo(540, 140, 56)}
<text x="540" y="250" text-anchor="middle" font-family="${F}" font-size="24" font-weight="800" letter-spacing="6" fill="#8fd8ff">NIGHTFLOW ANALYTICS</text>
<text x="540" y="380" text-anchor="middle" font-family="${F}" font-size="58" font-weight="800" fill="#ffffff">Tu regardes tes chiffres…</text>
<text x="540" y="470" text-anchor="middle" font-family="${F}" font-size="72" font-weight="800" fill="url(#neon)">et après ?</text>
<text x="540" y="560" text-anchor="middle" font-family="${F}" font-size="28" fill="#aeb8dd">80 % des e-commerçants voient les données</text>
<text x="540" y="600" text-anchor="middle" font-family="${F}" font-size="28" fill="#aeb8dd">sans savoir quoi en faire. Nightflow décide pour toi :</text>
<g font-family="${F}">
  <text x="180" y="710" font-size="30" fill="#7dffb0">✓ </text><text x="220" y="710" font-size="28" fill="#e6ecff">« Ton produit A = 58 % de ton CA »</text>
  <text x="180" y="770" font-size="30" fill="#7dffb0">✓ </text><text x="220" y="770" font-size="28" fill="#e6ecff">« Stock vide dans 4 jours, recommande »</text>
  <text x="180" y="830" font-size="30" fill="#7dffb0">✓ </text><text x="220" y="830" font-size="28" fill="#e6ecff">« Cette pub te fait perdre de l'argent »</text>
</g>
${cta(540, 910, 600, "Essai gratuit, sans carte")}
<text x="540" y="1046" text-anchor="middle" font-family="${F}" font-size="27" font-weight="600" fill="#8fd8ff">nightflow-analytics.vercel.app</text></svg>`;

// ── pub-4 : histoire fondateur (portrait) ──
const p4 = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">${defs}
<rect width="1080" height="1350" fill="url(#bg1)"/><rect width="1080" height="1350" fill="url(#bg2)"/>${stars(1080, 1350, 40, 9)}
${logo(540, 150, 58)}
<text x="540" y="262" text-anchor="middle" font-family="${F}" font-size="24" font-weight="800" letter-spacing="6" fill="#8fd8ff">NIGHTFLOW ANALYTICS</text>
<text x="540" y="400" text-anchor="middle" font-family="${F}" font-size="46" font-weight="700" fill="#aeb8dd">17 ans. Terminale. Multidys.</text>
<text x="540" y="520" text-anchor="middle" font-family="${F}" font-size="62" font-weight="800" fill="#ffffff">J'ai construit l'IA</text>
<text x="540" y="600" text-anchor="middle" font-family="${F}" font-size="62" font-weight="800" fill="#ffffff">qui traduit tes chiffres</text>
<text x="540" y="690" text-anchor="middle" font-family="${F}" font-size="66" font-weight="800" fill="url(#neon)">en phrases claires.</text>
<text x="540" y="800" text-anchor="middle" font-family="${F}" font-size="32" fill="#c9d2f0">Celle qui m'aurait aidé.</text>
<rect x="140" y="880" width="800" height="150" rx="22" fill="#3df2ff12" stroke="#3df2ff44" stroke-width="2"/>
<text x="540" y="945" text-anchor="middle" font-family="${F}" font-size="27" fill="#e6ecff">Connecte ta boutique (Shopify, Wix, WooCommerce…)</text>
<text x="540" y="985" text-anchor="middle" font-family="${F}" font-size="27" fill="#e6ecff">et elle te dit quoi faire. En 30 secondes par jour.</text>
${cta(540, 1130, 620, "Teste-la gratuitement")}
<text x="540" y="1268" text-anchor="middle" font-family="${F}" font-size="27" font-weight="600" fill="#8fd8ff">nightflow-analytics.vercel.app</text></svg>`;

await sharp(Buffer.from(p3)).png().toFile(`${OUT}/nightflow-pub-3.png`);
console.log("✓ nightflow-pub-3.png");
await sharp(Buffer.from(p4)).png().toFile(`${OUT}/nightflow-pub-4.png`);
console.log("✓ nightflow-pub-4.png");
