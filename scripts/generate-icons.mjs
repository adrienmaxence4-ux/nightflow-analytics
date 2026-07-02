/**
 * One-shot PWA icon generator (dev only): renders the Nightflow mark (crescent
 * moon in a neon ring on the night gradient) to every size the manifest and
 * iOS need. Run `node scripts/generate-icons.mjs` after changing the design.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

// rounded: transparent rounded-square (favicon / regular icons)
// full-bleed + safe-zone scale for maskable & iOS
function svg({ rounded }) {
  const content = `
    <circle cx="256" cy="256" r="150" fill="none" stroke="url(#ring)" stroke-width="22"/>
    <mask id="cres">
      <rect width="512" height="512" fill="black"/>
      <circle cx="248" cy="262" r="88" fill="white"/>
      <circle cx="292" cy="234" r="78" fill="black"/>
    </mask>
    <rect width="512" height="512" fill="#ffffff" mask="url(#cres)"/>
    <circle cx="330" cy="300" r="7" fill="#3df2ff"/>
    <circle cx="305" cy="335" r="4.5" fill="#9a6bff"/>
    <circle cx="352" cy="268" r="4" fill="#ff5cae"/>`;
  return Buffer.from(`<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3df2ff"/>
      <stop offset="0.55" stop-color="#9a6bff"/>
      <stop offset="1" stop-color="#ff5cae"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.3" cy="0.22" r="1.1">
      <stop offset="0" stop-color="#151C42"/>
      <stop offset="1" stop-color="#070B1A"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 115 : 0}" fill="url(#bg)"/>
  ${rounded ? content : `<g transform="translate(51.2,51.2) scale(0.8)">${content}</g>`}
</svg>`);
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  ["public/icons/icon-192.png", 192, { rounded: true }],
  ["public/icons/icon-512.png", 512, { rounded: true }],
  ["public/icons/maskable-512.png", 512, { rounded: false }],
  ["public/icons/apple-touch-icon.png", 180, { rounded: false }],
  ["app/icon.png", 64, { rounded: true }], // Next.js auto-favicon
];

for (const [out, size, opts] of jobs) {
  await sharp(svg(opts)).resize(size, size).png().toFile(out);
  console.log("✓", out, `${size}x${size}`);
}
