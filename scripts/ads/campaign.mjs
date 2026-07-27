/**
 * USINE À CONTENU — une seule commande produit toute la campagne.
 *
 *   npm run ads
 *
 * Génère les 4 pubs vidéo, puis écrit à côté un PLAN.md lisible sur téléphone
 * contenant, pour chaque pub : le lien de suivi (?a=CODE → mesuré dans /admin),
 * la légende prête à coller, les hashtags, la musique et la seconde de calage.
 *
 * Sortie : Downloads/nightflow-pubs-AAAA-MM-JJ/  (ou $ADS_OUT_DIR)
 * Le cron GitHub Actions lance exactement la même commande chaque semaine.
 */
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { synthesize, hasVoiceSupport } from "./voice.mjs";

const run = promisify(execFile);
/** `--voice` (or ADS_VOICE=1) adds a local French voice-over — see voice.mjs.
 *  The flag exists so the command works identically in PowerShell and bash. */
const WANT_VOICE =
  process.argv.includes("--voice") || process.env.ADS_VOICE === "1";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = process.env.ADS_SITE_URL ?? "https://nightflow-analytics.vercel.app";
const TODAY = new Date().toISOString().slice(0, 10);

const BASE_DIR = process.env.ADS_OUT_DIR ?? "C:/Users/adrie/Downloads";
const OUT_DIR = join(BASE_DIR, `nightflow-pubs-${TODAY}`);

const HASHTAGS =
  "#ecommerce #shopify #ecommercetips #dropshipping #entrepreneur " +
  "#entrepreneurfrance #businessenligne #woocommerce #shopifyfrance #saas " +
  "#intelligenceartificielle #ia #startup #entrepreneuriat #vendreenligne " +
  "#marketingdigital #boutiqueenligne #createurdentreprise #gagnerdelargent #sidehustle";

/**
 * The campaign. `focus` (env ADS_FOCUS) puts the winning angle first — read the
 * ranking on /admin ("Quelle pub marche") and pass it, e.g. ADS_FOCUS=fondateur.
 */
const ADS = [
  {
    code: "v1-probleme",
    angle: "probleme",
    script: "scripts/generate-video.mjs",
    file: "nightflow-video-1.mp4",
    titre: "Choc — « Ta boutique perd de l'argent »",
    musique: "Phonk / dark trap tendance — drop calé sur 3 s (apparition du logo)",
    voix: "Ta boutique perd de l'argent, et tu ne le vois même pas. Nightflow analyse tout à ta place : rupture de stock, publicité qui perd, opportunité ratée. Essaie gratuitement, sans carte.",
    legende: `Ta boutique perd de l'argent… et tu ne le vois même pas. 🌙

Rupture de stock qui arrive, pub qui creuse ton budget, canal rentable que tu sous-exploites : ces fuites sont invisibles dans un tableau de bord classique.

Nightflow Analytics les repère pour toi et te dit quoi faire, en une phrase claire.

Essai gratuit 30 jours, sans carte 👉 lien en bio`,
  },
  {
    code: "v2-fondateur",
    angle: "fondateur",
    script: "scripts/generate-video2.mjs",
    file: "nightflow-video-2.mp4",
    titre: "Histoire du fondateur — « 17 ans, multidys »",
    musique: "« Snowfall » — Øneheart & reidenshi · extrait 0:15→0:35 · drop 0:28 calé sur 7 s",
    voix: "J'ai dix-sept ans, je suis en terminale, et je suis multidys. J'ai construit l'intelligence artificielle qui lit tes chiffres à ta place. Une phrase claire, pas un tableau de bord.",
    legende: `17 ans. En Terminale. Multidys et TDA. 🌙

Et j'ai construit une IA pour les e-commerçants.

Pourquoi ? Parce que j'en avais marre des tableaux de bord qui affichent 12 graphiques… et qui ne te disent jamais quoi FAIRE.

Alors j'ai créé Nightflow Analytics : tu connectes ta boutique et l'IA traduit tes chiffres en phrases claires.

Une phrase. Pas un tableau de bord. 30 secondes par jour.

Essai gratuit 30 jours, sans carte 👉 lien en bio`,
  },
  {
    code: "v3-demo",
    angle: "demo",
    script: "scripts/generate-video3.mjs",
    file: "nightflow-video-3.mp4",
    titre: "Démo produit — on voit l'application",
    musique: "Chill / lo-fi tech tendance — drop quand l'insight finit de s'écrire (~7 s)",
    voix: "Voici ce que ta boutique devrait te dire chaque matin. Ton produit phare, ton stock, tes ventes, et surtout l'action à faire aujourd'hui. Connecte ta boutique, l'intelligence artificielle fait le reste.",
    legende: `Voici ce que ta boutique devrait te dire chaque matin 👇

Nightflow connecte ton Shopify (ou Wix, WooCommerce…) et transforme tes chiffres en UNE action claire :
✅ « Sérum Éclat = 58 % de ton CA »
✅ « Stock bas → recommande 60 unités »
✅ « Cette pub te fait perdre de l'argent »

Pas un tableau de bord de plus. Un plan d'action, chaque jour.

Essai gratuit 30 jours, sans carte 👉 lien en bio`,
  },
  {
    code: "v4-benefice",
    angle: "benefice",
    script: "scripts/generate-video4.mjs",
    file: "nightflow-video-4.mp4",
    titre: "Problème → bénéfice (temps + argent)",
    musique: "« Metamorphosis » — INTERWORLD · extrait 0:10→0:30 · drop 0:20 calé sur 7 s",
    voix: "Gérer une boutique en ligne, c'est un casse-tête. Des heures perdues dans les chiffres, du budget publicitaire gaspillé. Nightflow règle tout ça : tu gagnes du temps, et tu gagnes de l'argent.",
    legende: `Gérer une boutique en ligne, c'est un casse-tête. 🌙

Des heures perdues dans les tableaux. Des ruptures de stock qui coûtent cher. Du budget pub gaspillé. Et cette question chaque matin : « bon… je fais quoi maintenant ? »

C'est exactement pour ça que j'ai construit Nightflow Analytics.

Résultat chaque jour :
⏱️ Tu gagnes du temps — 30 secondes au lieu de 3 heures
💰 Tu gagnes de l'argent — moins de pertes, plus de ventes

Essai gratuit 30 jours, sans carte 👉 lien en bio`,
  },
];

/**
 * Replaces the video's silent track with the narration. The voice is padded
 * with silence (`apad`) so the VIDEO stays the reference length — without it
 * `-shortest` would cut the picture down to the length of the speech.
 */
async function addVoice(dir, file, text) {
  const wav = join(dir, ".voice.wav");
  if (!(await synthesize(text, wav, { rate: 1 }))) return null;
  const src = join(dir, file);
  // Voiced files get their own name: opening the wrong (silent) file by
  // mistake is otherwise impossible to notice.
  const voiced = file.replace(/\.mp4$/, "-AVEC-VOIX.mp4");
  const dst = join(dir, voiced);
  try {
    await run(ffmpegPath, [
      "-y",
      "-i", src,
      "-i", wav,
      "-filter_complex", "[1:a]aresample=44100,adelay=400,apad[a]",
      "-map", "0:v:0", "-map", "[a]",
      "-c:v", "copy", "-c:a", "aac", "-shortest",
      "-movflags", "+faststart",
      dst,
    ]);
    rmSync(src, { force: true }); // keep only the voiced version
    return voiced;
  } catch (e) {
    console.warn(`    ⚠ montage voix échoué : ${e.message}`);
    rmSync(dst, { force: true });
    return null;
  } finally {
    rmSync(wav, { force: true });
  }
}

function ordered() {
  const focus = (process.env.ADS_FOCUS ?? "").trim().toLowerCase();
  if (!focus) return ADS;
  const win = ADS.filter((a) => a.angle === focus);
  return win.length ? [...win, ...ADS.filter((a) => a.angle !== focus)] : ADS;
}

mkdirSync(OUT_DIR, { recursive: true });
const list = ordered();
console.log(`🎬 Campagne du ${TODAY} → ${OUT_DIR}`);
console.log(
  WANT_VOICE
    ? hasVoiceSupport()
      ? "🎙 Voix off : activée (voix française locale)\n"
      : "🎙 Voix off : demandée mais indisponible ici (Windows uniquement) — vidéos muettes\n"
    : "🔇 Voix off : désactivée (ADS_VOICE=1 pour l'activer)\n"
);

const done = [];
for (const ad of list) {
  console.log(`  ▶ ${ad.code} — ${ad.titre}`);
  try {
    await run(process.execPath, [ad.script], {
      cwd: ROOT,
      env: { ...process.env, ADS_OUT_DIR: OUT_DIR },
      maxBuffer: 10 * 1024 * 1024,
    });
    if (WANT_VOICE && ad.voix) {
      const voiced = await addVoice(OUT_DIR, ad.file, ad.voix);
      if (voiced) {
        ad.file = voiced;
        ad.avecVoix = true;
        console.log(`    🎙 voix off ajoutée`);
      }
    }
    done.push(ad);
    console.log(`    ✓ ${ad.file}`);
  } catch (e) {
    console.error(`    ✗ échec (${ad.code}) :`, e.message);
  }
}

// ── PLAN.md — tout ce qu'il faut pour publier, lisible sur téléphone ──
const md = [
  `# 📣 Pubs Nightflow — ${TODAY}`,
  ``,
  `**${done.length} pub(s) prête(s).** Pour chacune : ouvre Instagram → Reel →`,
  `choisis le fichier → mets la musique indiquée → colle la légende. ~60 secondes.`,
  ``,
  `> Le lien de suivi de chaque pub finit par \`?a=CODE\`. Mets-le en bio quand tu`,
  `> publies cette pub-là : tu verras dans **/admin → « Quelle pub marche »**`,
  `> laquelle t'amène le plus de visiteurs.`,
  ``,
  `---`,
  ``,
];
for (const ad of done) {
  md.push(
    `## ${ad.titre}`,
    ``,
    `- **Fichier** : \`${ad.file}\``,
    `- **Lien de suivi (à mettre en bio)** : ${SITE}/?a=${ad.code}`,
    `- **Musique** : ${ad.musique}`,
    ad.avecVoix
      ? `- **Voix off** : incluse — baisse la musique dans Instagram pour l'entendre`
      : `- **Voix off** : aucune (vidéo muette — la musique porte tout)`,
    ``,
    `**Légende à copier :**`,
    ``,
    "```",
    ad.legende,
    ``,
    HASHTAGS,
    "```",
    ``,
    `---`,
    ``
  );
}
md.push(
  `### Rappels`,
  `- La 1re ligne de la légende est le hook : c'est tout ce qu'on voit avant « … plus ».`,
  `- Le lien n'est pas cliquable dans une légende → il va dans la **bio**.`,
  `- Reposte en story avec le sticker « lien ».`,
  `- Réponds aux commentaires la 1re heure : ça booste la portée.`,
  ``
);

writeFileSync(join(OUT_DIR, "PLAN.md"), md.join("\n"), "utf8");
writeFileSync(
  join(OUT_DIR, "plan.json"),
  JSON.stringify({ date: TODAY, site: SITE, ads: done }, null, 2),
  "utf8"
);

console.log(`\n${"═".repeat(64)}`);
console.log(`✅ CAMPAGNE PRÊTE — ${done.length} pub(s)`);
console.log(`\n📂 TES FICHIERS SONT ICI :`);
console.log(`   ${OUT_DIR}`);
console.log(`\n   (copie ce chemin dans l'explorateur Windows, ou ouvre`);
console.log(`    Téléchargements → dossier "nightflow-pubs-${TODAY}")`);
console.log(`\n📄 Ouvre PLAN.md : légendes, musique et liens de suivi.`);
for (const ad of done) console.log(`   • ${ad.file}${ad.avecVoix ? "  🎙" : ""}`);
console.log(`${"═".repeat(64)}\n`);
