"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Database, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import {
  dismiss,
  clearDismissed,
  getDismissedIds,
  getSeenIds,
  isDesktopEnabled,
  markNotified,
  markSeen,
  setDesktopEnabled,
} from "@/lib/notif-prefs";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { TestPanel } from "@/features/admin/test-panel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  fetchNotifications,
  markAllRead,
  markNotificationRead,
  seedDemoNotifications,
  type NotificationSource,
} from "@/services/notifications.service";
import type { Notification } from "@/types";

const SEV_LABEL: Record<Notification["severity"], string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
  positive: "Positif",
};

const FILTERS = ["Toutes", "Non lues", "Critiques"];

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [source, setSource] = useState<NotificationSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState("Toutes");
  const [desktopOn, setDesktopOn] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => setDesktopOn(isDesktopEnabled()), []);

  const enableDesktop = async () => {
    if (typeof Notification === "undefined") {
      toast("Notifications bureau non supportées par ce navigateur", "info");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast("Permission refusée — autorise les notifications du site", "info");
      return;
    }
    // Don't replay existing alerts; only future ones will pop.
    markNotified(items.map((n) => n.id));
    setDesktopEnabled(true);
    setDesktopOn(true);
    new Notification("Nightflow · Notifications activées ✓", {
      body: "Tu recevras les nouvelles alertes ici, même en dehors de l'onglet.",
    });
    toast("Notifications bureau activées ✓");
  };

  // Applies persisted state: hides dismissed notifications and marks the ones
  // already seen as read — so on arrival you can tell new from already-viewed.
  const overlay = useCallback((raw: Notification[]) => {
    const dismissed = getDismissedIds();
    const seen = getSeenIds();
    setHiddenCount(raw.filter((n) => dismissed.has(n.id)).length);
    setItems(
      raw
        .filter((n) => !dismissed.has(n.id))
        .map((n) => ({ ...n, read: n.read || seen.has(n.id) }))
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    // Primary: live alerts computed from real data (integrations, stock, sales).
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { items?: Notification[] };
        if (j.items && j.items.length > 0) {
          setSource("live");
          overlay(j.items);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* fall back below */
    }
    const { source, items } = await fetchNotifications();
    setSource(source);
    overlay(items);
    setLoading(false);
  }, [overlay]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = items.filter((n) => {
    if (filter === "Non lues") return !n.read;
    if (filter === "Critiques") return n.severity === "critical";
    return true;
  });
  const unread = items.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    markSeen(items.map((n) => n.id)); // persist read state for live alerts
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    if (source === "db") await markAllRead();
    window.dispatchEvent(new Event("nightflow:notifs"));
    toast("Toutes les notifications marquées comme lues");
  };

  const handleMarkOne = async (id: string) => {
    markSeen([id]); // persist so it stays read on the next visit
    setItems((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (source === "db") await markNotificationRead(id);
    window.dispatchEvent(new Event("nightflow:notifs"));
  };

  // Permanently hide a notification — it won't reappear (persisted locally).
  const handleDismiss = (id: string) => {
    dismiss([id]);
    setItems((arr) => arr.filter((n) => n.id !== id));
    setHiddenCount((c) => c + 1);
    window.dispatchEvent(new Event("nightflow:notifs"));
    toast("Notification supprimée");
  };

  const handleRestore = () => {
    clearDismissed();
    setHiddenCount(0);
    load();
    toast("Notifications réaffichées");
  };

  const handleSeed = async () => {
    setSeeding(true);
    const n = await seedDemoNotifications();
    setSeeding(false);
    if (n > 0) {
      toast(`${n} notifications de démo ajoutées à ta base ✓`);
      load();
    } else {
      toast("Impossible d'ajouter les données (connecte-toi d'abord)", "info");
    }
  };

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        subtitle={
          loading
            ? "Chargement…"
            : `${unread} non lue${unread > 1 ? "s" : ""} · alertes intelligentes`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={enableDesktop}
              disabled={desktopOn}
              className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white disabled:opacity-60"
            >
              <Bell className="h-3.5 w-3.5" />
              {desktopOn ? "Notifications bureau activées" : "Activer les notifications bureau"}
            </button>
            {items.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
              >
                Tout marquer comme lu
              </button>
            )}
            {hiddenCount > 0 && (
              <button
                onClick={handleRestore}
                className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réafficher ({hiddenCount})
              </button>
            )}
          </div>
        }
      />

      <TestPanel onApplied={load} />

      {/* Bandeau source de données */}
      {!loading && (
        <div className="flex items-center gap-2 text-[11px] text-ink-mut">
          <Database className="h-3.5 w-3.5" />
          {source === "live"
            ? "Alertes en direct calculées sur vos données réelles"
            : source === "db"
              ? "Données en direct depuis votre base Supabase"
              : "Mode démo — données fictives (connectez Supabase pour la base réelle)"}
        </div>
      )}

      {/* Filtres */}
      {items.length > 0 && (
        <div className="flex w-fit gap-1 rounded-xl border border-glass-border bg-glass p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[9px] px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow"
                  : "text-ink-dim hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      )}

      {/* État vide (base connectée mais sans données) → proposer le seed */}
      {!loading && source === "db" && items.length === 0 && (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-glass-hi bg-glass-2 text-2xl">
            🌙
          </span>
          <div>
            <h3 className="text-[15px] font-bold">Votre base est vide pour l&apos;instant</h3>
            <p className="mt-1 max-w-sm text-[13px] text-ink-dim">
              Chargez un jeu de notifications de démonstration MoonStore
              directement dans votre vraie base Supabase pour voir la page en
              action.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-sm font-bold text-night-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {seeding ? "Ajout en cours…" : "Charger des notifications de démo"}
          </button>
        </Card>
      )}

      {/* Tout supprimé */}
      {!loading && items.length === 0 && hiddenCount > 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-2xl">🧹</span>
          <p className="text-sm text-ink-dim">
            Toutes les notifications ont été supprimées.
          </p>
          <button
            onClick={handleRestore}
            className="flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-4 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réafficher ({hiddenCount})
          </button>
        </Card>
      )}

      {/* Liste */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {visible.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`cursor-pointer p-4 transition ${
                  n.read
                    ? "opacity-60"
                    : "border-glass-hi shadow-[0_8px_24px_-16px_rgba(61,242,255,0.5)]"
                }`}
                onClick={() => !n.read && handleMarkOne(n.id)}
              >
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-border bg-glass text-xl">
                    {n.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={n.severity}>{SEV_LABEL[n.severity]}</Badge>
                      {!n.read ? (
                        <span className="rounded-full bg-neon-cyan/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-neon-cyan">
                          Nouveau
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-ink-mut">Vu</span>
                      )}
                      <span className="text-[11px] text-ink-mut">{n.time}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-neon-cyan shadow-glow" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(n.id);
                          }}
                          title="Supprimer cette notification"
                          aria-label="Supprimer"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-glass-border text-ink-mut transition hover:border-neon-pink/50 hover:text-neon-pinksoft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="mt-1.5 text-[14px] font-bold">{n.title}</h4>
                    <p className="mt-1 text-[12px] text-ink-dim">{n.body}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {items.length > 0 && visible.length === 0 && (
            <Card className="p-10 text-center text-sm text-ink-mut">
              Aucune notification dans cette catégorie 🌙
            </Card>
          )}
        </div>
      )}
    </PageTransition>
  );
}
