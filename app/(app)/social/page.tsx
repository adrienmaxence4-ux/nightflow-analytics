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
  WifiOff,
} from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * What was published on Instagram and TikTok and what it actually produced —
 * for every merchant, not just the owner.
 *
 * The page keeps two numbers deliberately apart. Views, likes and reach are
 * measured per post by the platform. Link visits are measured per tracking
 * code. They only join when a post published its own `?a=CODE` link — and when
 * it didn't, the page says so instead of showing a zero that reads like
 * failure. The same distinction is spelled out in the AI's context, so the
 * Copilot can compare posts without ever inventing a sale behind one.
 *
 * The two platforms sit in one list but are never blended: TikTok reports no
 * reach, so a TikTok card shows shares where an Instagram card shows reach,
 * and its engagement rate is over views — and says so under the number.
 *
 * Tracking-code totals are owner-only: they count visits to Nightflow's own
 * site, which is not a customer's question. So is the `?a=CODE` advice — a
 * customer who followed it would measure nothing, so they are told the honest
 * thing instead: nothing here is a sale.
 */
type Platform = "instagram" | "tiktok";

interface Post {
  id: string;
  platform: Platform;
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

type Source = "instagram" | "meta" | "windsor" | "tiktok";

interface Payload {
  postLimit: number;
  tiktokPostLimit: number;
  connected: boolean;
  source: Source | null;
  sources: Source[];
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

const SOURCE_LABEL: Record<Source, string> = {
  instagram: "Instagram",
  meta: "Meta",
  windsor: "Windsor",
  tiktok: "TikTok",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

/** "30 dernières publications Instagram, 20 dernières vidéos TikTok" — each cap is its own. */
function windowLabel(data: Payload): string {
  const tiktok = data.sources.includes("tiktok");
  const instagram = data.sources.some((s) => s !== "tiktok");
  const parts = [
    instagram && `${data.postLimit} dernières sur Instagram`,
    tiktok && `${data.tiktokPostLimit} dernières sur TikTok`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : `${data.postLimit} dernières publications`;
}

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

  const hasTiktok = data?.sources.includes("tiktok") ?? false;
  const reachKnown = (data?.totals.reach ?? 0) > 0;

  return (
    <PageTransition>
      <p className="max-w-[70ch] text-body text-ink2">
        Ce que vos publications Instagram et TikTok ont produit — vues, likes
        et engagement. Le Copilot lit ces chiffres et peut vous dire quoi
        publier ensuite.
      </p>

      {error && (
        <Card>
          <ErrorState
            icon={WifiOff}
            description={`${error} Rechargez la page ; si ça persiste, vérifiez vos connexions dans Intégrations.`}
            action={
              <Link href="/integrations">
                <Button size="sm" variant="outline">Voir les intégrations</Button>
              </Link>
            }
          />
        </Card>
      )}

      {!data && !error && (
        <div className="flex flex-col gap-5" aria-busy>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[155px] w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && !data.connected && (
        <Card>
          {isAdmin ? (
            <EmptyState
              icon={Plug}
              title="Aucun compte connecté"
              description="Connecte Instagram ou TikTok dans Intégrations pour voir tes publications ici. Aucune Page Facebook n'est nécessaire."
              action={
                <Link href="/integrations">
                  <Button size="sm">Connecter un compte</Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="Connexions Instagram et TikTok en cours de validation"
              description="Meta et TikTok vérifient encore Nightflow. Dès que c'est validé, vous connectez votre compte en un clic dans Intégrations, et vos publications apparaissent ici."
            />
          )}
        </Card>
      )}

      {data && data.connected && (
        <div className="flex flex-col gap-5">
          {/* ── Totals ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              icon={Film}
              label="Publications"
              value={`${data.totals.posts}`}
              sub={`dont ${data.totals.reels} vidéos courtes`}
            />
            <Stat
              icon={Eye}
              label="Vues"
              value={nf(data.totals.views)}
              sub={windowLabel(data)}
            />
            <Stat
              icon={Heart}
              label="Likes"
              value={nf(data.totals.likes)}
              sub={`sur ${data.totals.posts} publication${data.totals.posts > 1 ? "s" : ""}`}
            />
            {isAdmin ? (
              <Stat
                icon={Link2}
                label="Visites via lien"
                value={nf(data.totals.visits)}
                sub="tous codes confondus"
              />
            ) : (
              <Stat
                icon={Users}
                label="Portée"
                value={reachKnown ? nf(data.totals.reach) : "—"}
                muted={!reachKnown}
                sub={
                  hasTiktok
                    ? "Instagram seulement — TikTok ne la fournit pas"
                    : "comptes uniques atteints"
                }
              />
            )}
          </div>

          {data.error && (
            <div
              role="status"
              className="rounded-[12px] border border-line border-l-4 border-l-warn bg-warn-bg p-5"
            >
              <p className="text-small leading-relaxed text-ink2">{data.error}</p>
            </div>
          )}

          {/* ── The AI actually reads this ── */}
          {data.posts.length > 0 && (
            <div className="flex gap-3 rounded-[12px] border border-line bg-panel2 p-5">
              <Sparkles className="mt-0.5 h-5 w-5 flex-none text-accent-text" aria-hidden />
              <div className="text-small leading-relaxed text-ink2">
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
              <div className="text-small leading-relaxed text-ink2">
                {isAdmin ? (
                  <>
                    <b className="text-ink">
                      {data.attribution.postsWithoutCode} publication
                      {data.attribution.postsWithoutCode > 1 ? "s" : ""} sans lien de suivi.
                    </b>{" "}
                    Elles renvoient vers le lien en bio, le même pour toutes —
                    impossible de savoir laquelle a amené un visiteur. Pour
                    départager les Reels, mets un lien{" "}
                    <code className="rounded bg-panel2 px-1.5 text-accent-text">
                      ?a=CODE
                    </code>{" "}
                    différent dans chaque légende Instagram. Une description
                    TikTok n&apos;a pas de lien cliquable.
                  </>
                ) : (
                  <>
                    <b className="text-ink">
                      Aucune vente n&apos;est reliée à une publication.
                    </b>{" "}
                    Le lien en bio est le même pour toutes, sur Instagram comme
                    sur TikTok. Ces chiffres disent ce qui a été regardé et
                    partagé, pas ce qui a vendu.
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Posts ── */}
          <section>
            <h2 className="mb-3 flex flex-wrap items-center gap-2 text-label tracking-[0.06em] text-ink3">
              PUBLICATIONS
              {data.sources.map((s) => (
                <Badge key={s} variant="neutral">
                  via {SOURCE_LABEL[s]}
                </Badge>
              ))}
            </h2>
            {data.posts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Film}
                  title="Aucune publication trouvée"
                  description="Publiez un Reel ou un TikTok : il apparaît ici à la prochaine ouverture de la page."
                />
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {data.posts.map((p) => (
                  <Card key={p.id} className="p-6">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-[220px] flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">{PLATFORM_LABEL[p.platform]}</Badge>
                          {p.platform === "instagram" && (
                            <Badge variant={p.isReel ? "cool" : "neutral"}>
                              {p.isReel ? "Reel" : "Post"}
                            </Badge>
                          )}
                          <span className="text-[16px] text-ink3">
                            {shortDate(p.date)}
                          </span>
                          {p.trackingCode && (
                            <Badge variant="good">{p.trackingCode}</Badge>
                          )}
                        </div>
                        <p className="text-[18px] font-semibold leading-snug text-ink">
                          {excerpt(p.caption) || "Sans légende"}
                        </p>
                        {p.permalink && (
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[16px] text-accent-text hover:underline"
                          >
                            Voir sur {PLATFORM_LABEL[p.platform]}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <Metric label="Vues" value={nf(p.views)} />
                        <Metric label="Likes" value={nf(p.likes)} />
                        {p.platform === "tiktok" ? (
                          <Metric label="Partages" value={nf(p.shares)} />
                        ) : (
                          <Metric label="Portée" value={nf(p.reach)} />
                        )}
                        <Metric
                          label="Engagement"
                          value={`${p.engagementRate}%`}
                          sub={p.platform === "tiktok" ? "sur vues" : "sur portée"}
                        />
                        {isAdmin && (
                          <Metric
                            label="Visites"
                            value={p.visits == null ? "—" : nf(p.visits)}
                            muted={p.visits == null}
                            sub={p.visits == null ? "pas de lien" : "via le lien"}
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
              <h2 className="mb-3 text-label tracking-[0.06em] text-ink3">
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
                      <code className="text-small font-bold text-ink">{c.code}</code>
                      <span className="text-[16px] text-ink3">
                        {shortDate(c.firstSeen ?? "")} → {shortDate(c.lastSeen ?? "")}
                      </span>
                      <span className="ml-auto text-[18px] font-extrabold text-good">
                        {nf(c.visits)}
                        <span className="ml-1 text-label text-ink3">
                          visiteur{c.visits > 1 ? "s" : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-label font-normal leading-relaxed text-ink3">
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
  muted,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub: string;
  /** The platform did not measure this — a dash, not a zero that reads like failure. */
  muted?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-small font-semibold text-ink2">
        <Icon className="h-5 w-5 flex-none" strokeWidth={2} aria-hidden />
        {label}
      </div>
      <div
        className={`mt-1.5 font-display text-[40px] font-extrabold leading-[1.1] ${muted ? "text-ink3" : "text-ink"}`}
        data-numeric
      >
        {value}
      </div>
      <div className="mt-1 text-[16px] text-ink3">{sub}</div>
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: string;
  /** What the number is over — visible, because a title alone never reaches a phone. */
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-[72px]">
      <div className="text-label tracking-[0.06em] text-ink3">{label}</div>
      <div
        className={`font-display text-[26px] font-extrabold ${muted ? "text-ink3" : "text-ink"}`}
        data-numeric
      >
        {value}
      </div>
      {sub && <div className="text-label font-normal leading-tight text-ink3">{sub}</div>}
    </div>
  );
}
