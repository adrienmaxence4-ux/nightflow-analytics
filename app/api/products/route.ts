import { NextResponse } from "next/server";
import { getProductsForStore } from "@/services/store-data";
import { getProducts } from "@/services/products.service";

/**
 * GET /api/products
 * Real products for the user's store, falling back to the MoonStore mock.
 */
export async function GET() {
  const real = await getProductsForStore();
  if (real) {
    return NextResponse.json({ source: "db", products: real });
  }
  return NextResponse.json({ source: "mock", products: getProducts() });
}
