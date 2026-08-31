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
      <span className="grid h-14 w-14 place-items-center rounded-[16px] border border-line bg-panel2 text-2xl">
        <Lock className="h-6 w-6 text-ink" />
      </span>
      <div>
        <h3 className="text-[16px] font-bold">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink2">
          {message}
        </p>
      </div>
      <Link
        href="/billing"
        className="rounded-xl bg-accent px-5 py-2.5 text-[15px] font-bold text-accent-ink transition hover:brightness-95"
      >
        Passer en {plan}
      </Link>
    </Card>
  );
}
