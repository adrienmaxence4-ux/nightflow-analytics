"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { forwardRef, useEffect, useState } from "react";
import { env, isHcaptchaConfigured } from "@/lib/env";

/**
 * Renders nothing when no sitekey is configured (demo mode, or local dev
 * without NEXT_PUBLIC_HCAPTCHA_SITE_KEY) — Supabase only rejects requests for
 * a missing captchaToken when Attack Protection is actually turned on, so an
 * unconfigured environment stays click-through.
 *
 * The widget follows the auth pages' own theme (`#auth-root[data-theme]`,
 * see app/(auth)/layout.tsx), not the OS one: a white box on the dark card
 * is what the reviewer saw otherwise. hCaptcha reads `theme` once, so the
 * widget is re-keyed when the toggle flips it.
 */
function useAuthTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const root = document.getElementById("auth-root");
    if (!root) return;
    const read = () => setTheme(root.dataset.theme === "clair" ? "light" : "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export const HcaptchaWidget = forwardRef<
  HCaptcha,
  { onVerify: (token: string) => void; onExpire: () => void }
>(function HcaptchaWidget({ onVerify, onExpire }, ref) {
  const theme = useAuthTheme();
  if (!isHcaptchaConfigured) return null;
  return (
    <div className="flex justify-center">
      <HCaptcha
        key={theme}
        ref={ref}
        sitekey={env.hcaptchaSiteKey}
        theme={theme}
        onVerify={onVerify}
        onExpire={onExpire}
      />
    </div>
  );
});
