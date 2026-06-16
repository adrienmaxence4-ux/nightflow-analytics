import type { Product } from "@/types";
import { PRODUCTS } from "./mock/data";

export function getProducts(): Product[] {
  return PRODUCTS;
}

export function getTopProduct(): Product {
  return PRODUCTS[0];
}
