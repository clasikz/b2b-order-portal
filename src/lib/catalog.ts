import { prisma } from "@/lib/prisma";
import type { Catalog } from "@/lib/roster/types";

// Loads the product catalogue into the shape validation + pricing use.
export async function loadCatalog(): Promise<Catalog> {
  const products = await prisma.product.findMany();
  const catalog: Catalog = {};
  for (const p of products) {
    catalog[p.sku] = { name: p.name, size: p.size, active: p.active, unitPrice: p.unitPrice };
  }
  return catalog;
}
