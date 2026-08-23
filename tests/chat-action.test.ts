import { describe, expect, it } from "vitest";
import { extractChatAction } from "@/services/ai/chat-action";

/**
 * The marker is model output, so every case here is a way a model gets it
 * slightly wrong. The rule the tests enforce is one-directional: a malformed,
 * misplaced or duplicated marker may cost the button, but must never cost the
 * answer or leak raw JSON into the chat bubble.
 */

describe("extracting an action from a chat answer", () => {
  it("returns the prose untouched when no action is proposed", () => {
    const raw = "Ton Reel du 27 juillet a fait 95 vues.";
    expect(extractChatAction(raw)).toEqual({ text: raw, hint: null });
  });

  it("strips the marker and parses the hint", () => {
    const raw =
      'Le stock de Hoodie Sakura est à zéro.\n<<<ACTION {"kind":"product.stock.set","product":"Hoodie Sakura","value":60}>>>';
    const out = extractChatAction(raw);
    expect(out.text).toBe("Le stock de Hoodie Sakura est à zéro.");
    expect(out.text).not.toContain("ACTION");
    expect(out.hint).toEqual({
      kind: "product.stock.set",
      product: "Hoodie Sakura",
      value: 60,
    });
  });

  it("keeps the answer when the hint is malformed JSON", () => {
    const raw = 'Réassortis vite.\n<<<ACTION {"kind": product.stock.set,}>>>';
    const out = extractChatAction(raw);
    expect(out.text).toBe("Réassortis vite.");
    expect(out.hint).toBeNull();
  });

  it("never leaves marker fragments in the visible text", () => {
    const raw =
      'Baisse le prix.\n\n<<<ACTION {"kind":"product.price.update","product":"Lampe Galaxie","value":39}>>>\n';
    const out = extractChatAction(raw);
    expect(out.text).toBe("Baisse le prix.");
    expect(out.text).not.toMatch(/<<<|>>>/);
  });

  it("tolerates a trailing code fence around the marker", () => {
    const raw =
      'Crée un code promo.\n<<<ACTION {"kind":"discount.create","value":15}>>>```';
    const out = extractChatAction(raw);
    expect(out.text).toBe("Crée un code promo.");
    expect(out.hint).toEqual({ kind: "discount.create", value: 15 });
  });

  it("ignores a marker that is not at the end, so mid-text JSON is never hidden", () => {
    // The model explaining the format rather than using it. Stripping this
    // would silently delete the sentence the user asked for.
    const raw =
      'Voici le format : <<<ACTION {"kind":"discount.create","value":10}>>> puis ta réponse.';
    const out = extractChatAction(raw);
    expect(out.text).toBe(raw);
    expect(out.hint).toBeNull();
  });

  it("drops the hint when the model sent an action and no prose", () => {
    const raw = '<<<ACTION {"kind":"discount.create","value":10}>>>';
    const out = extractChatAction(raw);
    // The user asked a question; an empty bubble is worse than a useless one.
    expect(out.text).toBe(raw);
    expect(out.hint).toBeNull();
  });

  it("survives an empty or whitespace-only answer", () => {
    expect(extractChatAction("   ")).toEqual({ text: "", hint: null });
  });
});
