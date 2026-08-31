"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { DemoBanner } from "@/components/demo-banner";
import { ProductTable } from "@/features/products/product-table";
import { ProductDrawer } from "@/features/products/product-drawer";
import { getProducts } from "@/services/products.service";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const FILTERS = ["Tous", "Meilleures ventes", "En baisse"];
const LOW_STOCK = 20;

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>(getProducts());
  const [source, setSource] = useState<"db" | "mock" | null>(null);
  const [active, setActive] = useState<Product | null>(null);
  const [filter, setFilter] = useState("Tous");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const j = await res.json();
        setAllProducts(j.products);
        setSource(j.source);
        return;
      }
    } catch {
      /* repli sur les mocks */
    }
    setAllProducts(getProducts());
    setSource("mock");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = allProducts.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "Meilleures ventes") return p.trend === "up";
    if (filter === "En baisse") return p.trend === "down";
    return true;
  });

  const bestSeller = [...allProducts].sort((a, b) => b.sales - a.sales)[0];
  const atRisk = allProducts.filter((p) => p.trend === "down").length;
  const totalStock = allProducts.reduce((t, p) => t + p.stock, 0);
  const lowStock = [...allProducts].sort((a, b) => a.stock - b.stock)[0];

  return (
    <PageTransition>
      <DemoBanner source={source} onSeeded={load} />

      {/* 4 cartes de stats */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Produits en vente</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold" data-numeric>
            {allProducts.length}
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Meilleure vente</div>
          <div className="mt-1.5 font-display text-[28px] font-extrabold">
            {bestSeller?.name ?? "—"}
          </div>
          <div className="mt-1 text-[16px] text-ink3">
            {bestSeller?.revenueShare ?? 0} % du chiffre d&apos;affaires
          </div>
        </div>
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">En baisse</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold text-bad" data-numeric>
            {atRisk}
          </div>
          <div className="mt-1 text-[16px] text-ink3">à surveiller</div>
        </div>
        <div className="panel p-6">
          <div className="text-small font-semibold text-ink2">Stock total</div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold" data-numeric>
            {totalStock.toLocaleString("fr-FR")}
          </div>
          <div className="mt-1 text-[16px] text-ink3">unités</div>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[280px] max-w-[420px] flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 text-ink3"
            strokeWidth={2}
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un produit…"
            className="h-[52px] w-full rounded-[12px] border border-line bg-panel px-4 pl-12 text-[18px] text-ink outline-none transition placeholder:text-ink3 focus-visible:border-accent"
          />
        </div>
        <div className="flex gap-1.5 rounded-[12px] border border-line bg-panel p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-[8px] px-5 py-2.5 text-[16px] font-semibold transition duration-base ease-out",
                filter === f ? "bg-accent text-accent-ink" : "text-ink2 hover:text-ink"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ProductTable products={filtered} onSelect={setActive} />

      {lowStock && lowStock.stock < LOW_STOCK && (
        <div className="rounded-[12px] border border-line border-l-4 border-l-bad bg-bad-bg p-5 px-6">
          <p className="text-[18px] font-bold">
            {lowStock.name} : {lowStock.stock} unités en stock
          </p>
          <p className="mt-2 text-[17px] leading-relaxed text-ink2">
            Au rythme actuel, rupture imminente et plusieurs jours pour être
            réapprovisionné. Commandez maintenant ou activez une liste d&apos;attente.
          </p>
        </div>
      )}

      <ProductDrawer product={active} onClose={() => setActive(null)} />
    </PageTransition>
  );
}
