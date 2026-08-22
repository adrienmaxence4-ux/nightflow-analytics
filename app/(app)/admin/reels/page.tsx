"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Link2,
  Plug,
  Users,
} from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Founder-only: what was published on Instagram and what it actually produced.
 *
 * Numbers come from Meta directly when the connection carries the Instagram
 * permissions, and from Windsor only as a fallback — the badge next to the
 * list names the source, because "27 vues" means nothing without knowing who
 * counted them.
 *
 * The page deliberately keeps two numbers apart. Views, likes and reach are
 * measured per post. Link visits are measured per tracking code. They only
 * join when a post published its own `?a=CODE` link — and when it didn't, the
 * page says so instead of showing a zero that reads like failure.
 */
interface Post {
  id: string;
  date: string;
  caption: string;
  permalink: string;
  isReel: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  trackingCode: string | null;
  engagementRate: number;
  visits: number | null;
}

interface CodeStat {
  code: string;
  visits: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface Payload {
  days: number;
  connected: boolean;
  /** Which connector produced the numbers below. */
  source: "meta" | "windsor" | null;
  instagramError: string | null;
  posts: Post[];
  totals: {
    posts: number;
    reels: number;
    views: number;
    likes: number;
    reach: number;
    visits: number;
  };
  codes: CodeStat[];
  attribution: { postsWithCode: number; postsWithoutCode: number };
}

const nf = (n: number) => n.toLocaleString("fr-FR");

function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/** First meaningful line of a caption — enough to recognise the post. */
function excerpt(caption: string): string {
  const line = caption.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

export default function AdminReelsPage() {
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/reels", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Réservé à l'administrateur");
        return (await r.json()) as Payload;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!isAdmin) return null;

  return (
    <PageTransition>
      <PageHeader
        title="Mes publications"
        subtitle="Vues, likes et conversions de tes Reels — visible par toi seul."
      />

      {error && <Card className="p-6 text-sm text-neon-pinksoft">{error}</Card>}

      {!data && !error && (
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-5">
          {/* ── Totals ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={Film} label="Publications" value={`${data.totals.posts}`}
              sub={`dont ${data.totals.reels} Reels`} tone="#3df2ff" />
            <Stat icon={Eye} label="Vues" value={nf(data.totals.views)}
              sub={`${data.days} derniers jours`} tone="#9a6bff" />
            <Stat icon={Heart} label="Likes" value={nf(data.totals.likes)}
              sub={`${nf(data.totals.reach)} comptes touchés`} tone="#ff5cae" />
            <Stat icon={Link2} label="Visites via lien" value={nf(data.totals.visits)}
              sub="tous codes confondus" tone="#7dffb0" />
          </div>

          {/* ── No connector at all: the page has nothing to show ── */}
          {!data.connected && (
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-glass-hi bg-glass-2">
                <Plug className="h-4 w-4 text-neon-cyan" aria-hidden />
              </span>
              <p className="min-w-[240px] flex-1 text-[13px] leading-relaxed text-ink-dim">
                Connecte <b className="text-white">Meta Ads</b> dans Intégrations
                pour voir tes Reels ici. Ta connexion doit couvrir Instagram —
                voir la note ci-dessous.
              </p>
              <Link href="/integrations">
                <Button variant="primary" size="sm">Connecter Meta</Button>
              </Link>
            </Card>
          )}

          {data.instagramError && (
            <Card className="flex gap-3 border-neon-amber/35 p-5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-neon-amber" aria-hidden />
              <p className="text-[13px] leading-relaxed text-ink-dim">
                Instagram n&apos;a pas répondu : {data.instagramError}
              </p>
            </Card>
          )}

          {/* ── The honest bit about attribution ── */}
          {data.attribution.postsWithoutCode > 0 && (
            <Card className="flex gap-3 p-5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-neon-amber" aria-hidden />
              <div className="text-[13px] leading-relaxed text-ink-dim">
                <b className="text-white">
                  {data.attribution.postsWithoutCode} publication
                  {data.attribution.postsWithoutCode > 1 ? "s" : ""} sans lien de suivi.
                </b>{" "}
                Elles renvoient vers le lien en bio, qui est le même pour toutes —
                impossible de savoir laquelle a amené un visiteur. Pour les
                départager, mets un lien{" "}
                <code className="rounded bg-glass-2 px-1 text-neon-cyansoft">
                  ?a=CODE
                </code>{" "}
                différent dans chaque légende.
              </div>
            </Card>
          )}

          {/* ── Posts ── */}
          <section>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-[1.6px] text-ink-mut">
              PUBLICATIONS
              {data.source && (
                <Badge variant={data.source === "meta" ? "cyan" : "violet"}>
                  via {data.source === "meta" ? "Meta" : "Windsor"}
                </Badge>
              )}
            </h2>
            {data.posts.length === 0 ? (
              <Card className="p-6 text-center text-[13px] text-ink-mut">
                Aucune publication sur les {data.days} derniers jours.
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {data.posts.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-[220px] flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant={p.isReel ? "violet" : "cyan"}>
                            {p.isReel ? "Reel" : "Post"}
                          </Badge>
                          <span className="text-[11px] text-ink-mut">
                            {shortDate(p.date)}
                          </span>
                          {p.trackingCode && (
                            <Badge variant="lime">{p.trackingCode}</Badge>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold leading-snug text-ink">
                          {excerpt(p.caption)}
                        </p>
                        {p.permalink && (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11px] text-neon-cyansoft hover:underline"
                          >
                            Voir sur Instagram
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <Metric label="Vues" value={nf(p.views)} />
                        <Metric label="Likes" value={nf(p.likes)} />
                        <Metric label="Portée" value={nf(p.reach)} />
                        <Metric label="Engagement" value={`${p.engagementRate}%`} />
                        <Metric
                          label="Visites"
                          value={p.visits == null ? "—" : nf(p.visits)}
                          muted={p.visits == null}
                          title={
                            p.visits == null
                              ? "Pas de lien de suivi dans cette légende"
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Tracking codes ── */}
          {data.codes.length > 0 && (
            <section>
              <h2 className="mb-3 text-[10px] font-bold tracking-[1.6px] text-ink-mut">
                CONVERSIONS PAR LIEN DE SUIVI
              </h2>
              <Card className="p-5">
                <ul className="flex flex-col gap-2">
                  {data.codes.map((c) => (
                    <li
                      key={c.code}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-glass-border bg-glass px-3.5 py-3"
                    >
                      <Users className="h-4 w-4 flex-none text-neon-lime" aria-hidden />
                      <code className="text-[13px] font-bold text-ink">{c.code}</code>
                      <span className="text-[11px] text-ink-mut">
                        {shortDate(c.firstSeen ?? "")} → {shortDate(c.lastSeen ?? "")}
                      </span>
                      <span className="ml-auto text-[15px] font-extrabold text-neon-lime">
                        {nf(c.visits)}
                        <span className="ml-1 text-[11px] font-semibold text-ink-mut">
                          visiteur{c.visits > 1 ? "s" : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-mut">
                  Un visiteur n&apos;est compté qu&apos;une fois par jour et par
                  code. Aucune donnée personnelle n&apos;est enregistrée.
                </p>
              </Card>
            </section>
          )}
        </div>
      )}
    </PageTransition>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: tone }} aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mut">
          {label}
        </span>
      </div>
      <div className="text-[22px] font-extrabold leading-none text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-mut">{sub}</div>
    </Card>
  );
}

function Metric({
  label,
  value,
  muted,
  title,
}: {
  label: string;
  value: string;
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="min-w-[64px]" title={title}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mut">
        {label}
      </div>
      <div
        className={`text-[16px] font-extrabold ${muted ? "text-ink-mut" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
