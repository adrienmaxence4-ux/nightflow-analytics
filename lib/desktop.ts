/**
 * Desktop app (Nightflow Analytics for Windows) — download metadata.
 *
 * The installer (~80 MB) is NOT committed. `/api/desktop/download` resolves it
 * from one of two sources, in order:
 *
 *  1. DESKTOP_WINDOWS_URL — a direct https URL (Supabase Storage, R2, a public
 *     GitHub release asset…). Used as-is (302).
 *  2. GITHUB_RELEASE_REPO + GITHUB_TOKEN — a **private** GitHub repo's release.
 *     The route asks the GitHub API for the asset and 302s to its short-lived
 *     signed URL, so the repo stays private but the download is public.
 *
 * The /telecharger page only needs to know whether *some* source is configured.
 */
export const DESKTOP = {
  version: "1.0.0",
  /** Approximate installer size, for the download button label. */
  windowsSizeMb: 80,
  minOs: "Windows 10 / 11 · 64-bit",
  /** Release asset filename to look for on GitHub. */
  windowsAsset: "Nightflow-Setup.exe",
} as const;

/** Direct https URL of the Windows installer, or null. */
export function desktopWindowsUrl(): string | null {
  const url = process.env.DESKTOP_WINDOWS_URL?.trim();
  return url && /^https?:\/\//.test(url) ? url : null;
}

/** `owner/repo` of the private repo holding the release, or null. */
export function githubReleaseRepo(): string | null {
  const repo = process.env.GITHUB_RELEASE_REPO?.trim();
  return repo && /^[^/\s]+\/[^/\s]+$/.test(repo) ? repo : null;
}

/** True when at least one download source is configured. */
export function desktopDownloadReady(): boolean {
  return (
    desktopWindowsUrl() !== null ||
    (githubReleaseRepo() !== null && Boolean(process.env.GITHUB_TOKEN?.trim()))
  );
}
