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
      <p className="max-w-[70ch] text-body text-ink2">
        Ce que vos publications Instagram ont produit — vues, portée et engagement.
        Le Copilote lit ces chiffres et peut vous dire quoi publier ensuite.
      </p>

      {error && <Card className="p-6 text-[17px] text-bad">{error}</Card>}

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
                <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] border border-line bg-panel2">
                  <Plug className="h-5 w-5 text-accent-text" aria-hidden />
                </span>
                <p className="min-w-[240px] flex-1 text-[17px] leading-relaxed text-ink2">
                  Connecte <b className="text-ink">Instagram</b> dans
                  Intégrations pour voir tes publications ici. Aucune Page
                  Facebook n&apos;est nécessaire.
                </p>
                <Link href="/integrations">
                  <Button variant="primary" size="sm">Connecter Instagram</Button>
                </Link>
              </Card>
            ) : (
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] border border-line bg-panel2">
                  <Clock className="h-5 w-5 text-warn" aria-hidden />
                </span>
                <div className="min-w-[240px] flex-1 text-[17px] leading-relaxed text-ink2">
                  <b className="text-ink">
                    La connexion Instagram est en cours de validation par Meta.
                  </b>{" "}
                  Dès qu&apos;elle est accordée, vos publications et leurs
                  statistiques apparaissent ici automatiquement — vous n&apos;aurez
                  rien à réinstaller.
                </div>
              </Card>
            ))}

          {data.error && (
            <div className="rounded-[12px] border border-line border-l-4 border-l-warn bg-warn-bg p-5">
              <p className="text-[17px] leading-relaxed text-ink2">
                {data.error}
              </p>
            </div>
          )}

          {/* ── The AI actually reads this ── */}
          {data.posts.length > 0 && (
            <div className="flex gap-3 rounded-[12px] border border-line bg-panel2 p-5">
              <Sparkles className="mt-0.5 h-5 w-5 flex-none text-accent-text" aria-hidden />
              <div className="text-[17px] leading-relaxed text-ink2">
                <b className="text-ink">Le Copilot voit ces chiffres.</b> Vous
                pouvez lui demander quelle publication a le mieux marché, ou ce
                qu&apos;il faut publier ensuite — il répond sur vos vraies
                données, pas sur des moyennes du marché.{" "}
                <Link href="/copilot" className="text-accent-text hover:underline">
                  Ouvrir le Copilot
                </Link>
              </div>
            </div>
          )}

          {/* ── The honest bit about attribution ── */}
          {data.attribution.postsWithoutCode > 0 && (
            <div className="flex gap-3 rounded-[12px] border border-line border-l-4 border-l-warn bg-warn-bg p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-warn" aria-hidden />
              <div className="text-[17px] leading-relaxed text-ink2">
                <b className="text-ink">
                  {data.attribution.postsWithoutCode} publication
                  {data.attribution.postsWithoutCode > 1 ? "s" : ""} sans lien de suivi.
                </b>{" "}
                Elles renvoient vers le lien en bio, qui est le même pour toutes —
                impossible de savoir laquelle a amené un visiteur. Pour les
                départager, mettez un lien{" "}
                <code className="rounded bg-panel2 px-1.5 text-accent-text">
                  ?a=CODE
                </code>{" "}
                différent dans chaque légende.
              </div>
            </div>
          )}

          {/* ── Posts ── */}
          <section>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-[15px] font-bold tracking-[0.06em] text-ink3">
              PUBLICATIONS
              {data.source && (
                <Badge
                  variant={
                    data.source === "instagram"
                      ? "bad"
                      : data.source === "meta"
                        ? "cool"
                        : "neutral"
                  }
                >
                  via {SOURCE_LABEL[data.source]}
                </Badge>
              )}
            </h2>
            {data.posts.length === 0 ? (
              <Card className="p-6 text-center text-[17px] text-ink3">
                {data.connected
                  ? "Aucune publication trouvée."
                  : "Rien à afficher tant qu'aucun compte n'est connecté."}
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {data.posts.map((p) => (
                  <Card key={p.id} className="p-6">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-[220px] flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant={p.isReel ? "cool" : "neutral"}>
                            {p.isReel ? "Reel" : "Post"}
                          </Badge>
                          <span className="text-[16px] text-ink3">
                            {shortDate(p.date)}
                          </span>
                          {p.trackingCode && (
                            <Badge variant="good">{p.trackingCode}</Badge>
                          )}
                        </div>
                        <p className="text-[18px] font-semibold leading-snug text-ink">
                          {excerpt(p.caption)}
                        </p>
                        {p.permalink && (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[16px] text-accent-text hover:underline"
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
              <h2 className="mb-3 text-[15px] font-bold tracking-[0.06em] text-ink3">
                CONVERSIONS PAR LIEN DE SUIVI
              </h2>
              <Card className="p-5">
                <ul className="flex flex-col gap-2">
                  {data.codes.map((c) => (
                    <li
                      key={c.code}
                      className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-panel2 px-4 py-3.5"
                    >
                      <Users className="h-5 w-5 flex-none text-good" aria-hidden />
                      <code className="text-[17px] font-bold text-ink">{c.code}</code>
                      <span className="text-[16px] text-ink3">
                        {shortDate(c.firstSeen ?? "")} → {shortDate(c.lastSeen ?? "")}
                      </span>
                      <span className="ml-auto text-[18px] font-extrabold text-good">
                        {nf(c.visits)}
                        <span className="ml-1 text-[15px] font-semibold text-ink3">
                          visiteur{c.visits > 1 ? "s" : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[15px] leading-relaxed text-ink3">
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
  void tone;
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-small font-semibold text-ink2">
        <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
        {label}
      </div>
      <div className="mt-1.5 font-display text-[40px] font-extrabold text-ink" data-numeric>{value}</div>
      <div className="mt-1 text-[16px] text-ink3">{sub}</div>
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
    <div className="min-w-[72px]" title={title}>
      <div className="text-[15px] font-bold tracking-[0.06em] text-ink3">{label}</div>
      <div className={`font-display text-[26px] font-extrabold ${muted ? "text-ink3" : "text-ink"}`} data-numeric>
        {value}
      </div>
    </div>
  );
}
