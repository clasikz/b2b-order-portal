import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Product catalogue (from docs/product_catalog.csv).
const PRODUCTS = [
  { sku: "STK-JER-NAVY-Y8", name: "Stock Training Jersey Navy", category: "Stock", customizationType: "none", size: "Y8", unitPrice: 38.0 },
  { sku: "STK-JER-NAVY-ADULTM", name: "Stock Training Jersey Navy", category: "Stock", customizationType: "none", size: "M", unitPrice: 42.0 },
  { sku: "EMB-POLO-BLK-ADULTM", name: "Polo Shirt Black", category: "Stock plus embellishment", customizationType: "heat_seal", size: "M", unitPrice: 55.0 },
  { sku: "EMB-JACKET-ROYAL-ADULTL", name: "Team Jacket Royal", category: "Stock plus embellishment", customizationType: "heat_seal", size: "L", unitPrice: 88.0 },
  { sku: "SUB-JER-CUSTOM-ADULTL", name: "Sublimated Match Jersey", category: "Custom sublimation", customizationType: "sublimated", size: "L", unitPrice: 72.0 },
  { sku: "BAG-TEAM-BLK-OSFA", name: "Team Equipment Bag", category: "Stock plus embellishment", customizationType: "heat_seal", size: "OSFA", unitPrice: 48.0 },
  { sku: "SOCK-WHT-ADULT", name: "Performance Socks White", category: "Stock", customizationType: "none", size: "ADULT", unitPrice: 12.0 },
];

// Accounts (from docs/accounts.csv) + the real client (Taguig). Each gets a club manager login.
const CLUBS = [
  { id: "club_taguig", name: "Taguig Tigers FC", contactName: "Michael Jackson", pricingTier: "SILVER" as const, discountPct: 10, requiresDeposit: true, manager: "manager@taguig.test" },
  { id: "ACC-1001", name: "Northside Football Club", contactName: "Taylor Morgan", pricingTier: "GOLD" as const, discountPct: 15, requiresDeposit: false, manager: "manager@northside.test" },
  { id: "ACC-1002", name: "West Valley Sports Association", contactName: "Jordan Reyes", pricingTier: "SILVER" as const, discountPct: 10, requiresDeposit: true, manager: "manager@westvalley.test" },
  { id: "ACC-1003", name: "South Coast Juniors", contactName: "Casey Nguyen", pricingTier: "BRONZE" as const, discountPct: 5, requiresDeposit: true, manager: "manager@southcoast.test" },
];

async function main() {
  for (const p of PRODUCTS) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: p, create: p });
  }

  for (const c of CLUBS) {
    await prisma.club.upsert({
      where: { id: c.id },
      update: { name: c.name, contactName: c.contactName, pricingTier: c.pricingTier, discountPct: c.discountPct, requiresDeposit: c.requiresDeposit },
      create: { id: c.id, name: c.name, contactName: c.contactName, pricingTier: c.pricingTier, discountPct: c.discountPct, requiresDeposit: c.requiresDeposit },
    });
    await prisma.user.upsert({
      where: { email: c.manager },
      update: { role: "CLUB_MANAGER", clubId: c.id, name: `${c.name} Manager` },
      create: { email: c.manager, name: `${c.name} Manager`, role: "CLUB_MANAGER", clubId: c.id },
    });
  }

  // Shared internal staff.
  await prisma.user.upsert({
    where: { email: "designer@portal.test" },
    update: { role: "DESIGNER", name: "Design Studio" },
    create: { email: "designer@portal.test", name: "Design Studio", role: "DESIGNER" },
  });
  await prisma.user.upsert({
    where: { email: "warehouse@portal.test" },
    update: { role: "WAREHOUSE", name: "Warehouse Staff" },
    create: { email: "warehouse@portal.test", name: "Warehouse Staff", role: "WAREHOUSE" },
  });
  await prisma.user.upsert({
    where: { email: "admin@portal.test" },
    update: { role: "SUPER_ADMIN", name: "Super Admin" },
    create: { email: "admin@portal.test", name: "Super Admin", role: "SUPER_ADMIN" },
  });

  console.log(`Seed complete: ${PRODUCTS.length} products, ${CLUBS.length} clubs (+managers), designer, warehouse.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
