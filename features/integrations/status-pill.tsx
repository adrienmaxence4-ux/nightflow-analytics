"use client";

import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionState } from "@/services/integrations/engine/types";

/** Rend le cycle de vie de la connexion sous forme de pastille colorée. */
export function StatusPill({ state }: { state: ConnectionState }) {
  switch (state) {
    case "connected":
      return (
        <Badge variant="good">
          <Check className="h-[15px] w-[15px]" strokeWidth={3} /> Connecté
        </Badge>
      );
    case "syncing":
      return (
        <Badge variant="cool">
          <Loader2 className="h-[15px] w-[15px] animate-spin" /> Synchro…
        </Badge>
      );
    case "error":
      return (
        <Badge variant="bad">
          <AlertTriangle className="h-[15px] w-[15px]" /> Erreur
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="warn">
          <Clock className="h-[15px] w-[15px]" /> En validation
        </Badge>
      );
    default:
      return <Badge variant="neutral">Non connecté</Badge>;
  }
}

export interface IntegrationStatus {
  connected: boolean;
  state: ConnectionState;
  lastSync: string | null;
  error: string | null;
  shop?: string | null;
}

export const DEFAULT_STATUS: IntegrationStatus = {
  connected: false,
  state: "not_connected",
  lastSync: null,
  error: null,
};
