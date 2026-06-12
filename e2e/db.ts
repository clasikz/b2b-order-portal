import { PrismaClient, type OrderStatus } from "@prisma/client";

// Direct-DB seeding for E2E setup. Lets state-dependent tests (locked, pending, packed) start
// from a known state in one step instead of driving the whole UI flow. All orders are created
// under the isolated `e2e_club`, so the existing global teardown cleans them up.
const prisma = new PrismaClient();

// 1x1 transparent PNG, a valid data URL accepted by the image store.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Priced, valid roster (Silver-tier club) so the quote/invoice has real numbers.
const ENTRIES = [
  { teamSquad: "U12 Boys", jerseyNumber: 7, playerName: "A. Santos", size: "Y8", productSku: "STK-JER-NAVY-Y8", quantity: 1, packGroup: "U12 Boys Box" },
  { teamSquad: "Senior Men", jerseyNumber: 22, playerName: "C. Patel", size: "M", productSku: "EMB-POLO-BLK-ADULTM", quantity: 2, packGroup: "Senior Men Box" },
];

export type SeedOrder = { id: string; orderNumber: number; path: string };

// Create an order under e2e_club in the given state, optionally with a client reference and/or
// a designer proof. Locked/Packed orders get a LOCKED design lock.
export async function seedOrder(opts: {
  status: OrderStatus;
  withReference?: boolean;
  withProof?: boolean;
}): Promise<SeedOrder> {
  const mgr = await prisma.user.findUniqueOrThrow({ where: { email: "e2e-manager@portal.test" } });
  const designer = await prisma.user.findUniqueOrThrow({ where: { email: "designer@portal.test" } });

  const assets = [];
  if (opts.withReference) {
    assets.push({
      kind: "CLIENT_REFERENCE" as const,
      storedRef: TINY_PNG,
      uploaderEmail: mgr.email,
      uploaderName: mgr.name,
      uploaderRole: "CLUB_MANAGER" as const,
    });
  }
  if (opts.withProof) {
    assets.push({
      kind: "DESIGNER_PROOF" as const,
      storedRef: TINY_PNG,
      uploaderEmail: designer.email,
      uploaderName: designer.name,
      uploaderRole: "DESIGNER" as const,
    });
  }

  const locked = opts.status === "LOCKED_READY" || opts.status === "PACKED";

  const order = await prisma.order.create({
    data: {
      clubId: "e2e_club",
      status: opts.status,
      totalQty: 3,
      createdById: mgr.id,
      designLock: {
        create: locked
          ? { state: "LOCKED", lockedAt: new Date(), lockedById: mgr.id }
          : { state: "UNLOCKED" },
      },
      rosterEntries: { create: ENTRIES },
      ...(assets.length ? { designAssets: { create: assets } } : {}),
    },
  });

  return { id: order.id, orderNumber: order.orderNumber, path: `/orders/${order.id}` };
}
