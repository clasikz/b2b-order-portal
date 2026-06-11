import "server-only";
import { cookies } from "next/headers";
import type { Club, Role, User } from "@prisma/client";
import { prisma } from "./prisma";
import { SESSION_COOKIE } from "./session";
import { can, type Action } from "./rbac";

export type SessionUser = User & { club: Club | null };

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// Mock auth: the session cookie holds a seeded user id. Not for production.
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { club: true } });
}

export async function login(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated", 401);
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new AuthError("Forbidden", 403);
  return session;
}

// Server-side enforcement of the RBAC matrix (QA-20).
export async function requireAction(action: Action): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.role, action)) throw new AuthError("Forbidden", 403);
  return session;
}
