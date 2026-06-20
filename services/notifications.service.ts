"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/utils/format";
import { NOTIFICATIONS } from "./mock/data";
import type { Notification } from "@/types";
import type { NotificationRow } from "@/types/database";

/**
 * Writes (insert/update) cast to the default client: the hand-written
 * `Database` generic doesn't fully satisfy supabase-js's write inference
 * (it resolves cleanly once `npm run gen:types` regenerates exact types
 * against the live schema). Reads stay fully typed.
 */
function asWritable(client: NonNullable<ReturnType<typeof createClient>>) {
  return client as unknown as SupabaseClient;
}

export type NotificationSource = "db" | "mock" | "live";

type DbRow = Pick<
  NotificationRow,
  "id" | "type" | "severity" | "icon" | "title" | "body" | "read" | "created_at"
>;

function mapRow(r: DbRow): Notification {
  return {
    id: r.id,
    type: r.type,
    severity: r.severity,
    icon: r.icon ?? "🔔",
    title: r.title,
    body: r.body ?? "",
    time: timeAgo(r.created_at),
    read: r.read,
  };
}

/**
 * Load notifications.
 * - Supabase configuré → lit la vraie table (RLS = uniquement les tiennes).
 * - Sinon (mode démo local) → repli sur les données fictives.
 */
export async function fetchNotifications(): Promise<{
  source: NotificationSource;
  items: Notification[];
}> {
  const supabase = createClient();
  if (!supabase) return { source: "mock", items: NOTIFICATIONS };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, severity, icon, title, body, read, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return { source: "mock", items: NOTIFICATIONS };
  return { source: "db", items: (data as DbRow[]).map(mapRow) };
}

/** Insère un jeu de notifications de démo dans la vraie table (1 clic). */
export async function seedDemoNotifications(): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const rows = NOTIFICATIONS.map((n) => ({
    user_id: user.id,
    type: n.type,
    severity: n.severity,
    icon: n.icon,
    title: n.title,
    body: n.body,
    read: n.read,
  }));

  const { error } = await asWritable(supabase).from("notifications").insert(rows);
  return error ? 0 : rows.length;
}

/** Marque toutes les notifications non lues comme lues (vraie écriture en base). */
export async function markAllRead(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await asWritable(supabase)
    .from("notifications")
    .update({ read: true })
    .eq("read", false);
}

/** Marque une notification précise comme lue. */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await asWritable(supabase)
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}
