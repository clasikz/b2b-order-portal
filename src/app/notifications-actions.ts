"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationsWhere } from "@/lib/notifications";

// Mark a single notification read (on hover). Scoped to the current user's notifications.
export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id, ...notificationsWhere(session.id, session.role) },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
