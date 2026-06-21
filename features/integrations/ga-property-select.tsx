"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Ga4Property {
  id: string;
  name: string;
  account: string;
}

/**
 * Lets the user pick WHICH GA4 property powers the Analytics charts. We
 * auto-select the first property on connect, but the real traffic may live on
 * another one — this selector switches it. Only renders when GA is connected
 * and at least one property is available.
 */
export function GaPropertySelect({ onChange }: { onChange?: () => void }) {
  const toast = useToast();
  const [props, setProps] = useState<Ga4Property[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/integrations/google/properties")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { properties?: Ga4Property[]; current?: string } | null) => {
        if (j?.properties?.length) {
          setProps(j.properties);
          setCurrent(j.current ?? j.properties[0].id);
        }
      })
      .catch(() => {});
  }, []);

  if (props.length === 0) return null;

  const select = async (id: string) => {
    if (id === current) return;
    setBusy(true);
    setCurrent(id);
    try {
      const res = await fetch("/api/integrations/google/properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: id }),
      });
      if (res.ok) {
        toast("Propriété GA4 mise à jour ✓");
        onChange?.();
      } else {
        toast("Changement impossible", "info");
      }
    } catch {
      toast("Changement impossible", "info");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <span className="text-[13px] font-semibold">📊 Propriété Google Analytics</span>
      <select
        value={current}
        onChange={(e) => select(e.target.value)}
        disabled={busy}
        className="glass-input min-w-[220px] rounded-xl px-3 py-2 text-[13px] text-ink [&>option]:bg-night-900"
      >
        {props.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.account ? ` · ${p.account}` : ""} (#{p.id})
          </option>
        ))}
      </select>
      <span className="text-[11px] text-ink-mut">
        Choisis la propriété qui reçoit ton trafic réel.
      </span>
    </Card>
  );
}
