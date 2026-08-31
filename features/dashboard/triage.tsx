"use client";

import { useEffect, useState } from "react";
import { Eye, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TriageItem, TriageZones } from "@/types";

/**
 * « Votre point du jour » — l'activité triée en trois zones : ce qui rapporte,
 * ce qui coûte de l'argent, ce qu'il faut surveiller. Chaque ligne porte son
 * action ; sinon c'est un tableau de bord de plus.
 */
type ZoneKey = "winning" | "fix" | "watch";

const ZONES: {
  key: ZoneKey;
  label: string;
  icon: LucideIcon;
  tone: "good" | "bad" | "warn";
  empty: string;
}[] = [
  { key: "winning", label: "Ce qui marche", icon: TrendingUp, tone: "good", empty: "Rien à célébrer pour l'instant." },
  { key: "fix", label: "À régler maintenant", icon: TriangleAlert, tone: "bad", empty: "Aucun problème détecté." },
  { key: "watch", label: "À surveiller", icon: Eye, tone: "warn", empty: "Rien à surveiller." },
];

const TONE: Record<"good" | "bad" | "warn", { text: string; rule: string; bg: string }> = {
  good: { text: "text-good", rule: "border-good", bg: "bg-good-bg" },
  bad: { text: "text-bad", rule: "border-bad", bg: "bg-bad-bg" },
  warn: { text: "text-warn", rule: "border-warn", bg: "bg-warn-bg" },
};

function Row({ item, tone }: { item: TriageItem; tone: "good" | "bad" | "warn" }) {
  const t = TONE[tone];
  return (
    <article className={`rounded-r-[12px] border-l-4 ${t.rule} ${t.bg} p-4 px-[18px]`}>
      <p className="text-[18px] font-bold leading-snug text-ink">{item.title}</p>
      <p className="mt-2 text-[16px] leading-relaxed text-ink2">{item.detail}</p>
      <p className={`mt-2.5 text-[17px] font-bold leading-snug ${t.text}`}>
        À faire : {item.action}
        {item.impact ? ` ${item.impact}` : ""}
      </p>
    </article>
  );
}

export function Triage() {
  const [data, setData] = useState<TriageZones | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/triage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  return (
    <section>
      <h2 className="mb-1 mt-2 font-display text-[26px] font-extrabold">Votre point du jour</h2>
      <p className="mb-5 text-[17px] text-ink2">Ce qui va, ce qui ne va pas — et quoi faire.</p>

      {failed ? (
        <p className="rounded-r-[12px] border-l-4 border-bad bg-bad-bg p-4 px-[18px] text-[16px] text-ink2">
          Impossible de charger votre point du jour. Réessayez dans un instant.
        </p>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          {ZONES.map((zone) => {
            const items = data?.[zone.key];
            const Icon = zone.icon;
            return (
              <section key={zone.key} className="panel p-6">
                <h3 className={`mb-4 flex items-center gap-2.5 text-[19px] font-extrabold ${TONE[zone.tone].text}`}>
                  <Icon className="h-[22px] w-[22px] flex-none" strokeWidth={2.2} aria-hidden />
                  {zone.label}
                </h3>

                {!data ? (
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-[96px]" />
                    <Skeleton className="h-[96px]" />
                  </div>
                ) : items && items.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {items.map((it) => (
                      <Row key={it.id} item={it} tone={zone.tone} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[12px] border border-dashed border-line px-4 py-5 text-center text-[16px] text-ink3">
                    {zone.empty}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {data && !data.connected && (
        <p className="mt-4 text-[16px] text-ink3">
          Connectez votre boutique pour remplir ce tableau avec vos vraies données.
        </p>
      )}
    </section>
  );
}
