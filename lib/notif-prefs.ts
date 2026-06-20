/**
 * CLIENT-ONLY notification preferences, stored in localStorage:
 *  - which notification ids the user has already SEEN (clears the badge)
 *  - which ids already triggered a desktop notification (avoids duplicates)
 *  - whether desktop (OS) notifications are enabled
 */

const SEEN_KEY = "nf_seen_notif_ids";
const NOTIFIED_KEY = "nf_desktop_notified_ids";
const ENABLED_KEY = "nf_desktop_enabled";

function read(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function write(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function getSeenIds(): Set<string> {
  return read(SEEN_KEY);
}

/** Marks ids as seen; returns true if anything new was added. */
export function markSeen(ids: string[]): boolean {
  const s = read(SEEN_KEY);
  let changed = false;
  for (const id of ids) if (!s.has(id)) (s.add(id), (changed = true));
  if (changed) write(SEEN_KEY, s);
  return changed;
}

export function getNotifiedIds(): Set<string> {
  return read(NOTIFIED_KEY);
}

export function markNotified(ids: string[]): void {
  const s = read(NOTIFIED_KEY);
  for (const id of ids) s.add(id);
  write(NOTIFIED_KEY, s);
}

export function isDesktopEnabled(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "1";
}

export function setDesktopEnabled(v: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
  }
}
