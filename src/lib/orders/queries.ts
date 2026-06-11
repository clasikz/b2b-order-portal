import type { OrderStatus, Prisma, Role } from "@prisma/client";

// Role-scoped visibility for the dashboard (pure, unit-testable):
// - Club Manager: only their own club's orders
// - Designer: only orders submitted for design (not drafts)
// - Warehouse: only Locked/Ready production orders
// - Super Admin: everything
export function ordersWhereForRole(role: Role, clubId: string | null): Prisma.OrderWhereInput {
  switch (role) {
    case "CLUB_MANAGER":
      return { clubId: clubId ?? "__no_club__" };
    case "DESIGNER":
      return { status: { not: "DRAFT" } };
    case "WAREHOUSE":
      return { status: { in: ["LOCKED_READY", "PACKED"] } };
    case "SUPER_ADMIN":
    default:
      return {};
  }
}

// Single-order visibility (mirrors the dashboard filter) so direct URL access is enforced too.
export function canViewOrder(
  role: Role,
  clubId: string | null,
  order: { clubId: string; status: OrderStatus },
): boolean {
  switch (role) {
    case "CLUB_MANAGER":
      return order.clubId === clubId;
    case "DESIGNER":
      return order.status !== "DRAFT";
    case "WAREHOUSE":
      return order.status === "LOCKED_READY" || order.status === "PACKED";
    case "SUPER_ADMIN":
      return true;
    default:
      return false;
  }
}
