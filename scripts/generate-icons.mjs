/**
 * Générateur d'icônes PWA (dev only) : rend la marque Nightflow — croissant de
 * lune dans un carré ambre — à toutes les tailles dont le manifeste et iOS ont
 * besoin. Lancer `node scripts/generate-icons.mjs` après un changement de design.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const AMBER = "#d08b4f";
const INK = "#14171b";

// `rounded` : carré à coins arrondis (favicon / icônes classiques).
// `!rounded` : plein bord + zone de sécurité (maskable & iOS).
function svg({ rounded }) {
  // Croissant : disque plein moins un disque décalé, dans l'encre.
  const moon = `
    <mask id="cres">
      <rect width="512" height="512" fill="black"/>
      <circle cx="248" cy="262" r="120" fill="white"/>
      <circle cx="300" cy="226" r="104" fill="black"/>
    </mask>
    <rect width="512" height="512" fill="${INK}" mask="url(#cres)"/>`;
  return Buffer.from(`<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${rounded ? 115 : 0}" fill="${AMBER}"/>
  ${rounded ? moon : `<g transform="translate(51.2,51.2) scale(0.8)">${moon}</g>`}
</svg>`);
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  ["public/icons/icon-192.png", 192, { rounded: true }],
  ["public/icons/icon-512.png", 512, { rounded: true }],
  ["public/icons/maskable-512.png", 512, { rounded: false }],
  ["public/icons/apple-touch-icon.png", 180, { rounded: false }],
  ["app/icon.png", 64, { rounded: true }], // favicon auto de Next.js
];

for (const [out, size, opts] of jobs) {
  await sharp(svg(opts)).resize(size, size).png().toFile(out);
  console.log("✓", out, `${size}x${size}`);
}
