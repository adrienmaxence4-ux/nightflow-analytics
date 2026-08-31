"use client";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { exportProductsCsv } from "@/services/report.service";
import type { Product } from "@/types";

const LOW_STOCK = 20;

export function ProductTable({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
  title?: string;
}) {
  const toast = useToast();

  const th =
    "px-4 py-4 text-[15px] font-bold tracking-[0.06em] text-ink3";

  return (
    <section className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 p-4 pb-0">
        <p className="text-small text-ink3">Cliquez une ligne pour le détail.</p>
        <button
          type="button"
          onClick={() => {
            if (!products.length) {
              toast("Aucun produit à exporter", "info");
              return;
            }
            exportProductsCsv(products);
            toast(`Export CSV : ${products.length} produits`);
          }}
          className="inline-flex min-h-tap items-center rounded-[10px] border border-line bg-panel2 px-4 text-label font-semibold text-ink transition hover:text-ink"
        >
          Exporter
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-panel2">
              <th className={`${th} text-left`}>PRODUIT</th>
              <th className={`${th} text-right`}>VENTES</th>
              <th className={`${th} text-right`}>REVENU</th>
              <th className={`${th} text-right`}>STOCK</th>
              <th className={`${th} text-right`}>TENDANCE</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p)}
                className="cursor-pointer border-t border-line transition duration-base ease-out hover:bg-panel2"
              >
                <td className="px-4 py-[18px] text-[18px] font-bold">{p.name}</td>
                <td className="px-4 py-[18px] text-right text-[18px]" data-numeric>
                  {p.sales}
                </td>
                <td className="px-4 py-[18px] text-right text-[18px]" data-numeric>
                  {p.revenue}
                </td>
                <td
                  className={`px-4 py-[18px] text-right text-[18px] ${
                    p.stock < LOW_STOCK ? "font-bold text-bad" : ""
                  }`}
                  data-numeric
                >
                  {p.stock}
                </td>
                <td className="px-4 py-[18px] text-right">
                  {p.sales > 0 && p.delta ? (
                    <Badge variant={p.trend === "up" ? "good" : "bad"}>
                      {p.trend === "up" ? "↑" : "↓"} {p.delta}
                    </Badge>
                  ) : (
                    <span className="text-[16px] text-ink3">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
