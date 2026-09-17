import { describe, expect, it } from "vitest";
import { AUTH_ERROR_FALLBACK, frenchAuthError, isCaptchaError } from "@/lib/auth-errors";

describe("frenchAuthError", () => {
  it("distingue un secret hCaptcha mal configuré d'un captcha simplement expiré", () => {
    const config = frenchAuthError(
      "captcha protection: request disallowed (sitekey-secret-mismatch)"
    );
    const expired = frenchAuthError("captcha verification process failed");
    expect(config).toMatch(/configuration/);
    expect(expired).toMatch(/Rechargez/);
    expect(config).not.toBe(expired);
  });

  it("traduit les refus courants de Supabase", () => {
    expect(frenchAuthError("Invalid login credentials")).toBe("Email ou mot de passe incorrect.");
    expect(frenchAuthError("Email not confirmed")).toMatch(/Confirmez/);
    expect(frenchAuthError("User already registered")).toMatch(/existe déjà/);
    expect(frenchAuthError("Email rate limit exceeded")).toMatch(/Trop de tentatives/);
    expect(frenchAuthError("Password should be at least 6 characters")).toMatch(/10 caractères/);
    expect(frenchAuthError("Signups not allowed for this instance")).toMatch(/fermées/);
  });

  it("ne laisse jamais passer un message anglais brut", () => {
    for (const raw of [undefined, "", "Something unexpected 500"]) {
      expect(frenchAuthError(raw)).toBe(AUTH_ERROR_FALLBACK);
    }
  });
});

describe("isCaptchaError", () => {
  it("cible uniquement les refus de jeton captcha", () => {
    expect(isCaptchaError("captcha protection: request disallowed (x)")).toBe(true);
    expect(isCaptchaError("Invalid login credentials")).toBe(false);
    expect(isCaptchaError(undefined)).toBe(false);
  });
});
