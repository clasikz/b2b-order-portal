import type { Role } from "@prisma/client";

// Pure permission matrix - unit-testable without a DB.
export type Action =
  | "roster:upload"
  | "order:submit"
  | "order:view"
  | "design:reference" // client uploads a reference image
  | "design:proof" // designer uploads the actual design
  | "design:comment" // both sides post feedback
  | "design:lock" // client approves & locks
  | "design:revision" // client formally requests a revision
  | "integration:manage" // operate the ERP sync queue
  | "order:pack" // warehouse marks an order packed + invoiced
  | "settings:manage"; // configure ERP simulation + AI assist

const PERMISSIONS: Record<Role, Action[]> = {
  // Client: runs the order, gives design feedback, and approves/locks.
  CLUB_MANAGER: [
    "roster:upload",
    "order:submit",
    "order:view",
    "design:reference",
    "design:comment",
    "design:lock",
    "design:revision",
  ],
  // Designer: produces the artwork and responds to feedback.
  DESIGNER: ["order:view", "design:proof", "design:comment"],
  // Warehouse: views production-ready orders and picks & packs them.
  WAREHOUSE: ["order:view", "order:pack"],
  // Super admin: sees everything, owns system settings, and operates the ERP integration.
  SUPER_ADMIN: ["order:view", "integration:manage", "order:pack", "settings:manage"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].includes(action);
}
