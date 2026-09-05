"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { forwardRef } from "react";
import { env, isHcaptchaConfigured } from "@/lib/env";

/**
 * Renders nothing when no sitekey is configured (demo mode, or local dev
 * without NEXT_PUBLIC_HCAPTCHA_SITE_KEY) — Supabase only rejects requests for
 * a missing captchaToken when Attack Protection is actually turned on, so an
 * unconfigured environment stays click-through.
 */
export const HcaptchaWidget = forwardRef<
  HCaptcha,
  { onVerify: (token: string) => void; onExpire: () => void }
>(function HcaptchaWidget({ onVerify, onExpire }, ref) {
  if (!isHcaptchaConfigured) return null;
  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={ref}
        sitekey={env.hcaptchaSiteKey}
        onVerify={onVerify}
        onExpire={onExpire}
      />
    </div>
  );
});
