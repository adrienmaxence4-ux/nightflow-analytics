"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ProductTable } from "@/features/products/product-table";
import { ProductDrawer } from "@/features/products/product-drawer";
import { ProductBars } from "@/features/dashboard/product-bars";
import { getProducts } from "@/services/products.service";
import { getRangeDataSync } from "@/services/analytics.service";
import type { Product } from "@/types";

const FILTERS = ["Tous", "Meilleures ventes", "En baisse"];

export default function ProductsPage() {
  const allProducts = getProducts();
  const [active, setActive] = useState<Product | null>(null);
  const [filter, setFilter] = useState("Tous");
  const [query, setQuery] = useState("");

  const filtered = allProducts.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "Meilleures ventes") return p.trend === "up";
    if (filter === "En baisse") return p.trend === "down";
    return true;
  });

  const stats = [
    { l: "Total SKUs", v: "128", d: "+6 cette semaine" },
    { l: "Marge moyenne", v: "42%", d: "+1.2 pt" },
    { l: "Best-seller", v: "Aurora Hoodie", d: "72% du CA" },
    { l: "À surveiller", v: "3", d: "conversion faible" },
  ];

  return (
    <PageTransition>
      <PageHeader
        title="Produits"
        subtitle={`${allProducts.length} produits · ${filtered.length} affichés`}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i} hover className="p-5">
            <div className="text-xs font-semibold text-ink-dim">{s.l}</div>
            <div className="mt-2 text-[22px] font-extrabold tracking-tight">
              {s.v}
            </div>
            <div className="mt-2 text-[11px] text-ink-mut">{s.d}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-[320px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mut" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="glass-input w-full rounded-xl py-2.5 pl-10 pr-3.5 text-[13px]"
            />
          </div>
          <div className="ml-auto flex gap-1 rounded-xl border border-glass-border bg-glass p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-[9px] px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow"
                    : "text-ink-dim hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <ProductTable
          products={filtered}
          onSelect={setActive}
          title="Tous les produits"
        />
        <ProductBars data={getRangeDataSync("week").bars} />
      </div>

      <ProductDrawer product={active} onClose={() => setActive(null)} />
    </PageTransition>
  );
}
