"use client";

import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionState } from "@/services/integrations/engine/types";

/** Renders the connection lifecycle as a coloured badge. */
export function StatusPill({ state }: { state: ConnectionState }) {
  switch (state) {
    case "connected":
      return (
        <Badge variant="lime">
          <Check className="h-3 w-3" strokeWidth={3} /> Connecté
        </Badge>
      );
    case "syncing":
      return (
        <Badge variant="cyan">
          <Loader2 className="h-3 w-3 animate-spin" /> Synchro…
        </Badge>
      );
    case "error":
      return (
        <Badge variant="critical">
          <AlertTriangle className="h-3 w-3" /> Erreur
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" /> Expiré
        </Badge>
      );
    default:
      return <Badge variant="cyan">Disponible</Badge>;
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
