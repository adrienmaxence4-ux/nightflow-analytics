import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getKeyedProvider } from "@/services/integrations/registry";

/**
 * paypal/shipstation/mondialrelay/gorgias/hotjar had a real implementation in
 * services/integrations/engine/keyed-connectors.ts that no "Connecter" button
 * could ever reach — getKeyedProvider() didn't know their id, so the click
 * 404'd with "Fournisseur inconnu" no matter how correct the pasted key was.
 * These tests exercise the bridge (keyed-adapters.ts) the same way the
 * Integrations page does: through the registry, with a real (mocked) network
 * call — not a format check that would pass a dead API key.
 */

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

/** insert()/select() resolve empty; only used to prove sync doesn't throw. */
function fakeDb(): SupabaseClient {
  const chain = {
    select: () => chain,
    upsert: () => Promise.resolve({ error: null }),
    insert: () => Promise.resolve({ error: null }),
    eq: () => chain,
    in: () => Promise.resolve({ error: null }),
    limit: () => Promise.resolve({ data: [], error: null }),
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

afterEach(() => vi.unstubAllGlobals());

describe("previously-dead keyed connectors are reachable", () => {
  it("registers all five under the ids their Integrations cards post to", () => {
    for (const id of ["paypal", "shipstation", "mondialrelay", "gorgias", "hotjar"]) {
      expect(getKeyedProvider(id)).not.toBeNull();
    }
  });

  it("paypal.validate makes a real auth call and reports PayPal's own status", async () => {
    mockFetch(401, { error: "invalid_client" });
    const result = await getKeyedProvider("paypal")!.validate("id::secret");
    expect(result).not.toBe(true);
    if (typeof result !== "boolean") {
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/401/);
    }
  });

  it("paypal.validate rejects a malformed credential before ever calling the API", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal("fetch", async (...args: unknown[]) => {
      calls.push(args);
      throw new Error("should not be called");
    });
    const result = await getKeyedProvider("paypal")!.validate("just-one-token");
    expect(calls).toHaveLength(0);
    if (typeof result !== "boolean") {
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/clientId::clientSecret/);
    }
  });

  it("hotjar.validate surfaces the Scale-plan-only message rather than a generic 'invalid key'", async () => {
    mockFetch(403, { error: "forbidden" });
    const result = await getKeyedProvider("hotjar")!.validate("site::token");
    if (typeof result !== "boolean") {
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Scale/);
    }
  });

  it("gorgias.sync queues real events without throwing and reports how many", async () => {
    mockFetch(200, {
      data: [
        { id: 1, created_datetime: "2026-08-01T00:00:00Z", status: "open" },
        { id: 2, created_datetime: "2026-08-02T00:00:00Z", status: "closed" },
      ],
    });
    const summary = await getKeyedProvider("gorgias")!.sync(
      "acme::support@acme.com::key",
      "store-1",
      fakeDb()
    );
    expect(summary.orders).toBe(2);
    expect(summary.days).toBe(2);
    // Tickets carry no revenue — this must never show a fabricated "€ importés".
    expect(summary.revenueCents).toBe(0);
    expect(getKeyedProvider("gorgias")!.tracksRevenue).toBe(false);
    expect(getKeyedProvider("gorgias")!.resultNoun).toBe("ticket(s)");
  });

  it("gorgias rejects a domain that would redirect the request off gorgias.com", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal("fetch", async (...args: unknown[]) => {
      calls.push(args);
      throw new Error("should not be called");
    });
    // "#" truncates a URL at the fragment — https://evil.com#.gorgias.com/...
    // actually requests evil.com. This must be rejected before fetch runs.
    const result = await getKeyedProvider("gorgias")!.validate(
      "evil.com#::a@b.com::key"
    );
    expect(calls).toHaveLength(0);
    if (typeof result !== "boolean") {
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/domaine Gorgias invalide/);
    }
  });

  it("shipstation.sync reports its own noun and hides the revenue clause", () => {
    const def = getKeyedProvider("shipstation")!;
    expect(def.resultNoun).toBe("envoi(s)");
    expect(def.tracksRevenue).toBe(false);
  });

  it("paypal keeps the default revenue clause (a transaction genuinely has an amount)", () => {
    const def = getKeyedProvider("paypal")!;
    expect(def.tracksRevenue).not.toBe(false);
    expect(def.resultNoun).toBe("transaction(s)");
  });
});
