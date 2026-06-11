import { PrismaClient } from "@prisma/client";

// Delete every order created under the test club. The cascade removes roster entries, design
// locks/assets/comments, audit events, notifications, and integration jobs. The test club +
// manager are left in place for reuse.
async function globalTeardown() {
  const prisma = new PrismaClient();
  await prisma.order.deleteMany({ where: { clubId: "e2e_club" } });
  await prisma.$disconnect();
}

export default globalTeardown;
