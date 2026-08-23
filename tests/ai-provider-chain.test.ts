import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards the failure that cost the most time on this project: a provider that
 * cannot answer must never shadow one that can.
 *
 * GitHub Models was retired on 2026-07-30 while "auto" still preferred it. Its
 * token was set, so every request routed to a dead endpoint, every AI call
 * returned null, and the Copilot served canned text that read exactly like real
 * answers — with a perfectly valid Claude key sitting right there, unused.
 *
 * The chain is the fix, so the chain is what is tested: order, exclusion of
 * unconfigured providers, and an explicit AI_PROVIDER that names a provider it
 * has no key for.
 */

const state = { gemini: false, anthropic: false, aiProvider: "auto" };

vi.mock("@/lib/env", () => ({
  get env() {
    return {
      aiProvider: state.aiProvider,
      geminiKey: state.gemini ? "k" : "",
      geminiEndpoint: "https://example.invalid/v1beta/openai",
      geminiModel: "gemini-2.5-flash",
      anthropicKey: state.anthropic ? "k" : "",
    };
  },
  get isGeminiConfigured() {
    return state.gemini;
  },
  get isAiConfigured() {
    return state.anthropic;
  },
}));

const { providerChain, resolveProvider } = await import("@/services/ai/anthropic");

beforeEach(() => {
  state.gemini = false;
  state.anthropic = false;
  state.aiProvider = "auto";
});

describe("AI provider chain", () => {
  it("has no provider to offer when nothing is configured", () => {
    expect(providerChain()).toEqual([]);
    expect(resolveProvider()).toBe("none");
  });

  it("puts the free provider first, with Claude behind it as a fallback", () => {
    state.gemini = true;
    state.anthropic = true;
    expect(providerChain()).toEqual(["gemini", "anthropic"]);
    expect(resolveProvider()).toBe("gemini");
  });

  it("never lists a provider whose key is missing", () => {
    state.anthropic = true;
    expect(providerChain()).toEqual(["anthropic"]);
    expect(resolveProvider()).toBe("anthropic");
  });

  it("keeps Claude reachable as a second link, so a dead free tier cannot shadow it", () => {
    state.gemini = true;
    state.anthropic = true;
    // The exact GitHub Models scenario: first link unusable, second link fine.
    expect(providerChain()).toContain("anthropic");
    expect(providerChain().length).toBeGreaterThan(1);
  });

  it("returns nothing when AI_PROVIDER names a provider that has no key", () => {
    state.aiProvider = "anthropic";
    state.gemini = true; // configured, but explicitly not selected
    expect(providerChain()).toEqual([]);
    expect(resolveProvider()).toBe("none");
  });

  it("honours an explicit single-provider choice without adding a fallback", () => {
    state.aiProvider = "gemini";
    state.gemini = true;
    state.anthropic = true;
    expect(providerChain()).toEqual(["gemini"]);
  });
});
