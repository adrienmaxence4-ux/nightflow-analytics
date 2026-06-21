"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Shown in place of a gated feature when the user's plan doesn't include it.
 * Links to the Billing page to upgrade.
 */
export function UpgradeGate({
  title,
  message,
  plan = "Pro",
}: {
  title: string;
  message: string;
  plan?: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-glass-hi bg-gradient-to-br from-neon-violet/30 to-neon-pink/20 text-2xl">
        <Lock className="h-6 w-6 text-white" />
      </span>
      <div>
        <h3 className="text-[16px] font-bold">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-dim">
          {message}
        </p>
      </div>
      <Link
        href="/billing"
        className="rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-sm font-bold text-night-950 shadow-glow transition hover:brightness-110"
      >
        Passer en {plan}
      </Link>
    </Card>
  );
}
