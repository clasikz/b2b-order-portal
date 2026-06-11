"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { login } from "@/lib/auth";

// Mock login: pick a seeded demo account. No passwords (demo only).
export async function loginAs(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Unknown demo user "${email}". Have you run "npm run db:seed"?`);
  }
  await login(user.id);
  redirect("/");
}
