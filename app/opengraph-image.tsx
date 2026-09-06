import { ImageResponse } from "next/og";

/**
 * Carte de partage 1200×630, générée à la volée.
 *
 * L'`og:image` pointait sur /icons/icon-512.png : un carré, donc rogné par
 * LinkedIn, X et Slack qui attendent du 1,91:1. Chaque partage rendait une
 * icône coupée au lieu d'une carte lisible.
 *
 * Générée plutôt que dessinée dans un fichier : le texte suit la landing,
 * il n'y a pas d'image à réexporter quand la promesse change.
 *
 * Palette reprise du thème sombre (globals.css). Les valeurs sont écrites en
 * dur ici parce que Satori ne résout pas les variables CSS — c'est la seule
 * exception assumée à la règle « aucune couleur en dur ».
 */

/**
 * Runtime edge imposé : sous Node, @vercel/og résout sa police par défaut avec
 * `fileURLToPath` et fabrique un chemin invalide dès que le projet vit dans un
 * dossier contenant une espace sous Windows (`.\file:\C:\...\Saas%20e-commerce`),
 * ce qui fait tomber la route en 500. Le build edge charge sa police autrement
 * et n'a pas ce défaut, sur toutes les plateformes.
 */
export const runtime = "edge";

export const alt = "Nightflow Analytics — Votre copilote IA e-commerce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#e8dcc5";
const INK2 = "#d8bd91";
const ACCENT = "#c49a6c";
const ACCENT_INK = "#3a211a";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(160deg, #5a3025 0%, #3a211a 60%)",
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        {/* Marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: ACCENT,
              color: ACCENT_INK,
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            ☾
          </div>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 1, fontWeight: 800 }}>
            NIGHTFLOW
            <span style={{ color: INK2, fontWeight: 600, marginLeft: 10 }}>ANALYTICS</span>
          </div>
        </div>

        {/* Promesse — la même que le H1 de la landing. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Arrêtez de fixer des chiffres.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: ACCENT,
              marginTop: 6,
            }}
          >
            Sachez quoi faire.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: INK2,
              marginTop: 26,
              lineHeight: 1.4,
            }}
          >
            Votre copilote IA e-commerce : ce qui se passe, pourquoi, et quoi faire.
          </div>
        </div>

        {/* Preuve de compatibilité — ce que le lecteur veut savoir en un coup d'œil. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 44, height: 5, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 24, color: INK2, letterSpacing: 0.5 }}>
            Shopify · Wix · WooCommerce · Stripe · Klaviyo · GA4
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
