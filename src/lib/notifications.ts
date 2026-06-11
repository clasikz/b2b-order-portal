import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Create a notification targeted at a specific user OR a whole role.
export async function notify(args: {
  orderId?: string;
  recipientUserId?: string;
  recipientRole?: Role;
  message: string;
}) {
  await prisma.notification.create({
    data: {
      orderId: args.orderId,
      recipientUserId: args.recipientUserId,
      recipientRole: args.recipientRole,
      message: args.message,
    },
  });
}

// A user sees notifications addressed to them directly OR to their role.
export function notificationsWhere(userId: string, role: Role) {
  return { OR: [{ recipientUserId: userId }, { recipientRole: role }] };
}

export async function getNotifications(userId: string, role: Role) {
  const where = notificationsWhere(userId, role);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return { items, unread };
}
