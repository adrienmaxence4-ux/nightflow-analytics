import { NextResponse } from "next/server";
import {
  DESKTOP,
  desktopWindowsUrl,
  githubReleaseRepo,
} from "@/lib/desktop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/desktop/download → 302 to the Windows installer.
 *
 * Source 1: DESKTOP_WINDOWS_URL (direct https) — used as-is.
 * Source 2: a PRIVATE GitHub repo release — GITHUB_RELEASE_REPO (owner/repo) +
 *   GITHUB_TOKEN (fine-grained PAT, Contents: read). We look up the release
 *   (GITHUB_RELEASE_TAG or latest), find the .exe asset, and redirect to the
 *   short-lived signed URL GitHub hands back — the repo stays private, the
 *   download is public, and the ~80 MB never flows through this function.
 *
 * 503 when nothing is configured, 502 when GitHub is configured but the lookup
 * fails.
 */
export async function GET() {
  const direct = desktopWindowsUrl();
  if (direct) {
    return NextResponse.redirect(direct, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const repo = githubReleaseRepo();
  const token = process.env.GITHUB_TOKEN?.trim();

  if (!repo || !token) {
    return NextResponse.json(
      {
        error: "not_published",
        message:
          "Installateur non publié. Définissez DESKTOP_WINDOWS_URL, ou GITHUB_RELEASE_REPO + GITHUB_TOKEN.",
      },
      { status: 503 },
    );
  }

  const gh = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "nightflow-analytics",
  };

  const tag = process.env.GITHUB_RELEASE_TAG?.trim();
  const releaseUrl = tag
    ? `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`
    : `https://api.github.com/repos/${repo}/releases/latest`;

  try {
    const relRes = await fetch(releaseUrl, { headers: gh, cache: "no-store" });
    if (!relRes.ok) {
      return NextResponse.json(
        { error: "github_release_not_found", status: relRes.status },
        { status: 502 },
      );
    }

    const release = (await relRes.json()) as {
      assets?: { name: string; url: string }[];
    };
    const want = DESKTOP.windowsAsset.toLowerCase();
    const asset =
      release.assets?.find((a) => a.name.toLowerCase() === want) ??
      release.assets?.find((a) => a.name.toLowerCase().endsWith(".exe"));

    if (!asset) {
      return NextResponse.json(
        { error: "asset_not_found", message: `Aucun ${DESKTOP.windowsAsset} dans la release.` },
        { status: 502 },
      );
    }

    // Asking for the raw bytes returns a 302 to a signed, tokenless CDN URL.
    const assetRes = await fetch(asset.url, {
      headers: { ...gh, Accept: "application/octet-stream" },
      redirect: "manual",
      cache: "no-store",
    });
    const signed = assetRes.headers.get("location");

    if (!signed) {
      return NextResponse.json(
        { error: "no_signed_url", status: assetRes.status },
        { status: 502 },
      );
    }

    return NextResponse.redirect(signed, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}
