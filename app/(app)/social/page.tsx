"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Heart,
  Link2,
  Plug,
  Sparkles,
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
 * What was published on Instagram and what it actually produced — for every
 * merchant, not just the owner.
 *
 * The page keeps two numbers deliberately apart. Views, likes and reach are
 * measured per post by the platform. Link visits are measured per tracking
 * code. They only join when a post published its own `?a=CODE` link — and when
 * it didn't, the page says so instead of showing a zero that reads like
 * failure. The same distinction is spelled out in the AI's context, so the
 * Copilot can compare posts without ever inventing a sale behind one.
 *
 * Tracking-code totals are owner-only: they count visits to Nightflow's own
 * site, which is not a customer's question.
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
  postLimit: number;
  connected: boolean;
  source: "instagram" | "meta" | "windsor" | null;
  error: string | null;
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

const SOURCE_LABEL: Record<string, string> = {
  instagram: "Instagram",
  meta: "Meta",
  windsor: "Windsor",
};

export default function SocialPage() {
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Impossible de charger vos publications.");
        return (await r.json()) as Payload;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <PageTransition>
      <PageHeader
        title="Publications"
        subtitle="Vues, portée et engagement de vos publications Instagram — et ce que l'IA en sait."
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
              sub={`${data.postLimit} dernières publications`} tone="#9a6bff" />
            <Stat icon={Heart} label="Likes" value={nf(data.totals.likes)}
              sub={`${nf(data.totals.reach)} comptes touchés`} tone="#ff5cae" />
            {isAdmin ? (
              <Stat icon={Link2} label="Visites via lien" value={nf(data.totals.visits)}
                sub="tous codes confondus" tone="#7dffb0" />
            ) : (
              <Stat icon={Users} label="Portée" value={nf(data.totals.reach)}
                sub="comptes uniques atteints" tone="#7dffb0" />
            )}
          </div>

          {/* ── Not connected ── */}
          {!data.connected &&
            (isAdmin ? (
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-glass-hi bg-glass-2">
                  <Plug className="h-4 w-4 text-neon-cyan" aria-hidden />
                </span>
                <p className="min-w-[240px] flex-1 text-[13px] leading-relaxed text-ink-dim">
                  Connecte <b className="text-white">Instagram</b> dans
                  Intégrations pour voir tes publications ici. Aucune Page
                  Facebook n&apos;est nécessaire.
                </p>
                <Link href="/integrations">
                  <Button variant="primary" size="sm">Connecter Instagram</Button>
                </Link>
              </Card>
            ) : (
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-glass-hi bg-glass-2">
                  <Clock className="h-4 w-4 text-neon-amber" aria-hidden />
                </span>
                <div className="min-w-[240px] flex-1 text-[13px] leading-relaxed text-ink-dim">
                  <b className="text-white">
                    La connexion Instagram est en cours de validation par Meta.
                  </b>{" "}
                  Dès qu&apos;elle est accordée, vos publications et leurs
                  statistiques apparaissent ici automatiquement — vous n&apos;aurez
                  rien à réinstaller.
                </div>
              </Card>
            ))}

          {data.error && (
            <Card className="flex gap-3 border-neon-amber/35 p-5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-neon-amber" aria-hidden />
              <p className="text-[13px] leading-relaxed text-ink-dim">
                {data.error}
              </p>
            </Card>
          )}

          {/* ── The AI actually reads this ── */}
          {data.posts.length > 0 && (
            <Card className="flex gap-3 border-neon-violet/30 p-5">
              <Sparkles className="mt-0.5 h-4 w-4 flex-none text-neon-violet" aria-hidden />
              <div className="text-[13px] leading-relaxed text-ink-dim">
                <b className="text-white">Le Copilot voit ces chiffres.</b> Vous
                pouvez lui demander quelle publication a le mieux marché, ou ce
                qu&apos;il faut publier ensuite — il répond sur vos vraies
                données, pas sur des moyennes du marché.{" "}
                <Link href="/copilot" className="text-neon-cyansoft hover:underline">
                  Ouvrir le Copilot
                </Link>
              </div>
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
                départager, mettez un lien{" "}
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
                <Badge
                  variant={
                    data.source === "instagram"
                      ? "pink"
                      : data.source === "meta"
                        ? "cyan"
                        : "violet"
                  }
                >
                  via {SOURCE_LABEL[data.source]}
                </Badge>
              )}
            </h2>
            {data.posts.length === 0 ? (
              <Card className="p-6 text-center text-[13px] text-ink-mut">
                {data.connected
                  ? "Aucune publication trouvée."
                  : "Rien à afficher tant qu'aucun compte n'est connecté."}
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
                        {isAdmin && (
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
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Tracking codes — owner only ── */}
          {isAdmin && data.codes.length > 0 && (
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
