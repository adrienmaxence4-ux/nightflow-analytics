"use client";

import { useEffect, useState } from "react";
import { MonitorDown, Share, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

/** Chrome's install event (not yet in the DOM lib types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Installer l'application" card: uses the browser install prompt when
 * available (Chrome/Edge desktop & Android), shows the Add-to-Home-Screen
 * steps on iOS Safari, and confirms when already installed (standalone mode).
 */
export function InstallApp() {
  const toast = useToast();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast("Nightflow installé sur cet appareil 🎉");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") toast("Installation annulée", "info");
    setDeferred(null);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-glass-hi bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20">
          <Smartphone className="h-5 w-5 text-neon-cyansoft" />
        </span>
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-bold">
            Application desktop & mobile
            {installed && <Badge variant="lime">Installée ✓</Badge>}
          </h3>
          <p className="text-xs text-ink-mut">
            Installez Nightflow comme une vraie application — icône, plein
            écran, notifications.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {installed ? (
          <p className="text-[13px] text-ink-dim">
            Nightflow tourne déjà en mode application sur cet appareil. Vous
            pouvez l&apos;épingler à la barre des tâches ou à l&apos;écran
            d&apos;accueil.
          </p>
        ) : deferred ? (
          <button
            onClick={install}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-cyansoft px-5 py-2.5 text-sm font-bold text-night-950 shadow-glow transition hover:brightness-110"
          >
            <MonitorDown className="h-4 w-4" />
            Installer l&apos;application
          </button>
        ) : isIos ? (
          <div className="rounded-xl border border-glass-border bg-glass-2 p-3.5 text-[13px] leading-relaxed text-ink-dim">
            Sur iPhone / iPad : ouvrez Nightflow dans Safari, touchez{" "}
            <Share className="inline h-3.5 w-3.5" />{" "}
            <b className="text-white">Partager</b>, puis{" "}
            <b className="text-white">« Sur l&apos;écran d&apos;accueil »</b>.
          </div>
        ) : (
          <p className="text-[13px] text-ink-dim">
            Dans Chrome ou Edge, cliquez sur l&apos;icône{" "}
            <MonitorDown className="inline h-3.5 w-3.5" /> «&nbsp;Installer&nbsp;»
            dans la barre d&apos;adresse (elle apparaît après quelques visites),
            ou menu ⋮ → «&nbsp;Installer Nightflow&nbsp;».
          </p>
        )}
      </div>
    </Card>
  );
}
