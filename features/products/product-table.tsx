"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { exportProductsCsv } from "@/services/report.service";
import type { Product } from "@/types";

export function ProductTable({
  products,
  onSelect,
  title = "Performance produits",
}: {
  products: Product[];
  onSelect: (p: Product) => void;
  title?: string;
}) {
  const toast = useToast();

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold">{title}</h3>
          <div className="text-xs text-ink-mut">
            cliquez une ligne pour le détail
          </div>
        </div>
        <button
          onClick={() => {
            if (!products.length) {
              toast("Aucun produit à exporter", "info");
              return;
            }
            exportProductsCsv(products);
            toast(`Export CSV : ${products.length} produits ✓`);
          }}
          className="rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-ink-dim transition hover:border-glass-hi hover:text-white hover:shadow-glow"
        >
          Exporter
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["PRODUIT", "VENTES", "REVENU", "CONV.", "TENDANCE"].map((h) => (
                <th
                  key={h}
                  className="border-b border-glass-border px-3 py-2.5 text-left text-[10px] font-bold tracking-[1px] text-ink-mut"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect(p)}
                className="cursor-pointer border-b border-[rgba(120,140,255,0.06)] text-[13px] transition hover:bg-glass-2"
              >
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3 font-semibold">
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-glass-border bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 text-base">
                      {p.icon}
                    </span>
                    {p.name}
                  </div>
                </td>
                <td className="px-3 py-3.5">{p.sales}</td>
                <td className="px-3 py-3.5">{p.revenue}</td>
                <td className="px-3 py-3.5">{p.conversion}</td>
                <td className="px-3 py-3.5">
                  {p.sales > 0 && p.delta ? (
                    <Badge variant={p.trend === "up" ? "lime" : "pink"}>
                      {p.trend === "up" ? "▲" : "▼"} {p.delta}
                    </Badge>
                  ) : (
                    <span className="text-[12px] text-ink-mut">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
