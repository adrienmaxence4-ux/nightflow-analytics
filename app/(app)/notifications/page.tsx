"use client";

import { useCallback, useEffect, useState } from "react";
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
  critical: "Urgent",
  warning: "Attention",
  info: "Info",
  positive: "Bonne nouvelle",
};

const SEV_BADGE: Record<Notification["severity"], "bad" | "warn" | "cool" | "good"> = {
  critical: "bad",
  warning: "warn",
  info: "cool",
  positive: "good",
};

const SEV_RULE: Record<Notification["severity"], string> = {
  critical: "border-l-bad",
  warning: "border-l-warn",
  info: "border-l-cool",
  positive: "border-l-good",
};

const FILTERS = ["Toutes", "Non lues", "Urgentes"];

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
    if (filter === "Urgentes") return n.severity === "critical";
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
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-body text-ink2">
          {loading ? "Chargement…" : `${unread} alerte${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}`}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <button
            onClick={enableDesktop}
            disabled={desktopOn}
            className="inline-flex min-h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition hover:bg-panel2 disabled:opacity-60"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
            {desktopOn ? "Notifications bureau activées" : "Activer les notifications bureau"}
          </button>
          {items.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex min-h-tap items-center rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition hover:bg-panel2"
            >
              Tout marquer comme lu
            </button>
          )}
          {hiddenCount > 0 && (
            <button
              onClick={handleRestore}
              className="inline-flex min-h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition hover:bg-panel2"
            >
              <RotateCcw className="h-[18px] w-[18px]" aria-hidden />
              Réafficher ({hiddenCount})
            </button>
          )}
        </div>
      </div>

      <TestPanel onApplied={load} />

      {/* Bandeau source de données */}
      {!loading && (
        <div className="flex items-center gap-2 text-[15px] text-ink3">
          <Database className="h-[18px] w-[18px]" aria-hidden />
          {source === "live"
            ? "Alertes en direct calculées sur vos données réelles"
            : source === "db"
              ? "Données en direct depuis votre base Supabase"
              : "Mode démo — données fictives (connectez Supabase pour la base réelle)"}
        </div>
      )}

      {/* Filtres */}
      {items.length > 0 && (
        <div className="flex w-fit gap-1.5 rounded-[12px] border border-line bg-panel p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[8px] px-5 py-2.5 text-[16px] font-semibold transition ${
                filter === f ? "bg-accent text-accent-ink" : "text-ink2 hover:text-ink"
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
          <span className="grid h-14 w-14 place-items-center rounded-[16px] border border-line bg-panel2">
            <Bell className="h-6 w-6 text-ink3" aria-hidden />
          </span>
          <div>
            <h3 className="text-head font-bold">Votre base est vide pour l&apos;instant</h3>
            <p className="mt-1 max-w-sm text-[16px] text-ink2">
              Chargez un jeu de notifications de démonstration MoonStore
              directement dans votre vraie base Supabase pour voir la page en
              action.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex min-h-tap items-center gap-2 rounded-[12px] bg-accent px-5 text-[17px] font-bold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {seeding ? "Ajout en cours…" : "Charger des notifications de démo"}
          </button>
        </Card>
      )}

      {/* Tout supprimé */}
      {!loading && items.length === 0 && hiddenCount > 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-body text-ink2">
            Toutes les notifications ont été supprimées.
          </p>
          <button
            onClick={handleRestore}
            className="inline-flex min-h-tap items-center gap-2 rounded-[12px] border border-line bg-panel px-4 text-label font-semibold text-ink transition hover:bg-panel2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réafficher ({hiddenCount})
          </button>
        </Card>
      )}

      {/* Liste */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {visible.map((n) => (
            <div key={n.id}>
              <Card
                className={`cursor-pointer border-l-4 p-6 transition ${SEV_RULE[n.severity]} ${
                  n.read ? "opacity-60" : ""
                }`}
                onClick={() => !n.read && handleMarkOne(n.id)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={SEV_BADGE[n.severity]}>{SEV_LABEL[n.severity]}</Badge>
                  {!n.read ? (
                    <span className="rounded-pill bg-accent px-2.5 py-0.5 text-[13px] font-bold text-accent-ink">
                      Nouveau
                    </span>
                  ) : (
                    <span className="text-[15px] font-semibold text-ink3">Vu</span>
                  )}
                  <span className="text-[16px] text-ink3">{n.time}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(n.id);
                    }}
                    title="Supprimer cette notification"
                    aria-label="Supprimer"
                    className="ml-auto grid h-9 w-9 place-items-center rounded-[10px] border border-line text-ink3 transition hover:text-bad"
                  >
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                </div>
                <h3 className="mt-3 text-[20px] font-bold leading-snug">{n.title}</h3>
                <p className="mt-2 text-[17px] leading-relaxed text-ink2">{n.body}</p>
              </Card>
            </div>
          ))}
          {items.length > 0 && visible.length === 0 && (
            <Card className="p-10 text-center text-[17px] text-ink3">
              Aucune notification dans cette catégorie.
            </Card>
          )}
        </div>
      )}
    </PageTransition>
  );
}
