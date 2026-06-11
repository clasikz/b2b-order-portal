import { PrismaClient } from "@prisma/client";

// Create an isolated test club + manager so E2E data never touches the demo clubs. Also clear
// any orders left over from a previous run.
async function globalSetup() {
  const prisma = new PrismaClient();
  await prisma.club.upsert({
    where: { id: "e2e_club" },
    update: {},
    create: {
      id: "e2e_club",
      name: "E2E Test Club",
      contactName: "E2E",
      pricingTier: "SILVER",
      discountPct: 10,
      requiresDeposit: true,
    },
  });
  await prisma.user.upsert({
    where: { email: "e2e-manager@portal.test" },
    update: { role: "CLUB_MANAGER", clubId: "e2e_club", name: "E2E Manager" },
    create: {
      email: "e2e-manager@portal.test",
      name: "E2E Manager",
      role: "CLUB_MANAGER",
      clubId: "e2e_club",
    },
  });
  await prisma.order.deleteMany({ where: { clubId: "e2e_club" } });
  await prisma.$disconnect();
}

export default globalSetup;
