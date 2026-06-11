import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

// DEV-ONLY testing aid: sets the mock session cookie from a URL and redirects, so headless
// capture tools (Playwright) can reach authenticated pages without clicking the login form.
// Disabled outside development. Never available in production.
//   /api/dev-login?email=manager@taguig.test&next=/orders/abc
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  const next = url.searchParams.get("next") || "/";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: `Unknown user "${email}"` }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
