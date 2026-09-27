import type { ReactNode } from "react";
import { ArrowRight, Moon } from "lucide-react";
import type { BriefItem, Severity } from "@/types";

/**
 * The Daily Brief — level 1 of the product. No hooks, so the landing can
 * render it on the server with the MoonStore sample and the dashboard can
 * render it with the real alerts.
 *
 * Colour never carries the meaning alone: every row has a written level, and
 * the level order (action → watch → positive → info) is the reading order.
 */
const LEVEL: Record<
  Severity,
  { label: string; dot: string; rule: string; bg: string; text: string }
> = {
  critical: { label: "Action nécessaire", dot: "bg-bad", rule: "border-bad", bg: "bg-bad-bg", text: "text-bad" },
  warning: { label: "À surveiller", dot: "bg-warn", rule: "border-warn", bg: "bg-warn-bg", text: "text-warn" },
  positive: { label: "Positif", dot: "bg-good", rule: "border-good", bg: "bg-good-bg", text: "text-good" },
  info: { label: "Information", dot: "bg-cool", rule: "border-cool", bg: "bg-cool-bg", text: "text-cool" },
};

const ORDER: Record<Severity, number> = { critical: 0, warning: 1, positive: 2, info: 3 };

export function sortBrief(items: BriefItem[]): BriefItem[] {
  return [...items].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

/** Ten seconds a line, twenty at least — honest for a three-line brief. */
export function readSeconds(count: number): number {
  return Math.max(20, count * 10);
}

export function briefHeadline(count: number): string {
  if (count === 0) return "Rien ne réclame ton attention aujourd'hui.";
  if (count === 1) return "Une chose mérite ton attention aujourd'hui.";
  return `${count} choses méritent ton attention aujourd'hui.`;
}

export function BriefRow({ item, animate = false, index = 0 }: { item: BriefItem; animate?: boolean; index?: number }) {
  const l = LEVEL[item.severity];
  const meta = [item.since, item.scope].filter(Boolean).join(" · ");
  return (
    <article
      className={`rounded-r-[12px] border-l-4 ${l.rule} ${l.bg} p-4 px-[18px] ${animate ? "nf-reveal" : ""}`}
      style={animate ? { animationDelay: `${80 + index * 70}ms` } : undefined}
    >
      <p className={`flex items-center gap-2 text-label font-extrabold tracking-[0.06em] ${l.text}`}>
        <span className={`h-2.5 w-2.5 flex-none rounded-pill ${l.dot}`} aria-hidden />
        {l.label.toUpperCase()}
      </p>
      <p className="mt-1.5 text-[19px] font-bold leading-snug text-ink" data-numeric>
        {item.title}
      </p>
      <p className="mt-1.5 text-[16px] leading-relaxed text-ink2">{item.detail}</p>
      {meta && <p className="mt-1 text-[15px] text-ink3">{meta}</p>}
      <p className="mt-2.5 flex gap-2 text-[16px] font-semibold leading-snug text-ink">
        <ArrowRight className={`mt-0.5 h-[18px] w-[18px] flex-none ${l.text}`} aria-hidden />
        <span>
          {item.action}
          {item.impact ? <span className="font-normal text-ink2"> — {item.impact}</span> : null}
        </span>
      </p>
    </article>
  );
}

export function BriefPanel({
  greeting = "Bonjour.",
  items,
  tag,
  footer,
  animate = false,
  className = "",
}: {
  greeting?: string;
  items: BriefItem[];
  /** Small pill next to the greeting — "Boutique fictive MoonStore" on the landing. */
  tag?: ReactNode;
  footer?: ReactNode;
  /** Staggered reveal, for the landing hero only. */
  animate?: boolean;
  className?: string;
}) {
  const sorted = sortBrief(items);
  return (
    <section
      aria-label="Daily Brief"
      className={`rounded-xl border border-line bg-panel p-5 sm:p-6 ${className}`}
    >
      {/* The tag wraps under the title on narrow screens instead of squeezing
          the headline into a one-word-per-line column. */}
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-accent">
          <Moon className="h-5 w-5 text-accent-ink" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-[240px]">
          <p className="text-[15px] font-semibold text-ink3">{greeting}</p>
          <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[24px]">
            {briefHeadline(sorted.length)}
          </h2>
        </div>
        {tag}
      </header>

      <div className="mt-5 flex flex-col gap-3">
        {sorted.map((item, i) => (
          <BriefRow key={item.id} item={item} animate={animate} index={i} />
        ))}
      </div>

      <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[15px] text-ink3">
        <span>Temps de lecture : ~{readSeconds(sorted.length)} s</span>
        {footer}
      </footer>
    </section>
  );
}
