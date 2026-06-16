"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NOTIFICATIONS } from "@/services/mock/data";
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
  const [items, setItems] = useState<Notification[]>(NOTIFICATIONS);
  const [filter, setFilter] = useState("Toutes");

  const visible = items.filter((n) => {
    if (filter === "Non lues") return !n.read;
    if (filter === "Critiques") return n.severity === "critical";
    return true;
  });
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
    toast("Toutes les notifications marquées comme lues");
  };

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} non lue${unread > 1 ? "s" : ""} · alertes intelligentes`}
        action={
          <button
            onClick={markAllRead}
            className="rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white"
          >
            Tout marquer comme lu
          </button>
        }
      />

      <div className="flex gap-1 rounded-xl border border-glass-border bg-glass p-1 w-fit">
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

      <div className="flex flex-col gap-3">
        {visible.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className={`p-4 ${n.read ? "opacity-65" : ""}`}>
              <div className="flex gap-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-border bg-glass text-xl">
                  {n.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={n.severity}>{SEV_LABEL[n.severity]}</Badge>
                    <span className="text-[11px] text-ink-mut">{n.time}</span>
                    {!n.read && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-neon-cyan shadow-glow" />
                    )}
                  </div>
                  <h4 className="mt-1.5 text-[14px] font-bold">{n.title}</h4>
                  <p className="mt-1 text-[12px] text-ink-dim">{n.body}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        {visible.length === 0 && (
          <Card className="p-10 text-center text-sm text-ink-mut">
            Aucune notification dans cette catégorie 🌙
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
