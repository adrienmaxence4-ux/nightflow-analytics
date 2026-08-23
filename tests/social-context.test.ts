import { describe, expect, it } from "vitest";
import { formatSocialContext } from "@/services/ai/store-context";
import { emptyOverview, type SocialOverview, type SocialPost } from "@/services/social/overview";

/**
 * The social block is the one place where two incompatible measurements sit
 * next to each other: platform-reported views, and site-reported visits. The
 * only bridge between them is a tracking code the merchant puts in the caption
 * themselves.
 *
 * These tests guard that boundary. If the attribution warning ever disappears,
 * the Copilot starts crediting Reels with revenue nobody measured — a mistake
 * that reads perfectly plausible and would quietly drive real spending
 * decisions.
 */

function post(over: Partial<SocialPost> = {}): SocialPost {
  return {
    id: "1",
    date: "2026-08-21",
    caption: "Une légende de test",
    permalink: "https://instagram.com/reel/x",
    isReel: true,
    views: 100,
    likes: 10,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: 50,
    trackingCode: null,
    engagementRate: 20,
    visits: null,
    ...over,
  };
}

function overview(posts: SocialPost[]): SocialOverview {
  const withCode = posts.filter((p) => p.trackingCode).length;
  return {
    ...emptyOverview(),
    connected: true,
    source: "instagram",
    posts,
    totals: {
      posts: posts.length,
      reels: posts.filter((p) => p.isReel).length,
      views: posts.reduce((t, p) => t + p.views, 0),
      likes: posts.reduce((t, p) => t + p.likes, 0),
      reach: posts.reduce((t, p) => t + p.reach, 0),
      visits: 0,
    },
    attribution: {
      postsWithCode: withCode,
      postsWithoutCode: posts.length - withCode,
    },
  };
}

describe("social context for the AI", () => {
  it("tells the AI to state no figures when nothing is connected", () => {
    const text = formatSocialContext(emptyOverview()).join("\n");
    expect(text).toMatch(/aucun compte social connecté/i);
    expect(text).toMatch(/n'avance aucun chiffre/i);
  });

  it("distinguishes a connected account from one with no recent posts", () => {
    const text = formatSocialContext({
      ...emptyOverview(),
      connected: true,
    }).join("\n");
    expect(text).toMatch(/aucune publication/i);
    expect(text).not.toMatch(/aucun compte social connecté/i);
  });

  it("forbids attributing revenue to a post that carries no tracking code", () => {
    const text = formatSocialContext(overview([post()])).join("\n");
    expect(text).toContain("aucun lien de suivi");
    expect(text).toMatch(/IMPOSSIBLE/);
    expect(text).toMatch(/ne relie jamais ces publications à un chiffre d'affaires/i);
  });

  it("drops the warning once every post carries a code", () => {
    const text = formatSocialContext(
      overview([post({ trackingCode: "reel1", visits: 12 })])
    ).join("\n");
    expect(text).toContain("12 visite(s) via le lien reel1");
    expect(text).not.toMatch(/IMPOSSIBLE/);
  });

  it("reports real per-post figures the AI can compare", () => {
    const text = formatSocialContext(
      overview([post({ views: 95, reach: 76, likes: 1, engagementRate: 1.3 })])
    ).join("\n");
    expect(text).toContain("95 vues");
    expect(text).toContain("76 touchés");
    expect(text).toContain("engagement 1.3%");
  });

  it("caps the post list so a prolific account cannot flood the context", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      post({ id: String(i), caption: `Publication numéro ${i}` })
    );
    const lines = formatSocialContext(overview(many));
    const postLines = lines.filter((l) => l.startsWith("- 2026-"));
    expect(postLines.length).toBeLessThanOrEqual(12);
    expect(lines.join("\n")).toContain("30 publication(s)");
  });
});
