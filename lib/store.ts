import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. The id of the store owned by `userId`, or null.
 *
 * Tenant isolation must never rest on RLS alone. Every store lookup filters on
 * `owner_id` explicitly and orders deterministically, so a mis-scoped policy, a
 * dropped `ENABLE ROW LEVEL SECURITY`, or an accidental swap to the service-role
 * client can't hand one user another tenant's store (which the old
 * `from("stores").select("id").limit(1)` — first row, whatever it is — would).
 */
export async function ownedStoreId(
  db: Pick<SupabaseClient, "from">,
  userId: string
): Promise<string | null> {
  if (!userId) return null;
  const { data } = await db
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0] as { id: string } | undefined)?.id ?? null;
}

/** Same, but returns the whole row (callers that need name/currency/etc.). */
export async function ownedStore<T = Record<string, unknown>>(
  db: Pick<SupabaseClient, "from">,
  userId: string
): Promise<T | null> {
  if (!userId) return null;
  const { data } = await db
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0] as T | undefined) ?? null;
}
