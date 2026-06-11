import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth";
import { applyDesignAction, DesignActionError } from "@/lib/design/lock-service";
import type { DesignAction } from "@/lib/design/lock-rules";

// POST /api/design-lock - lock a design or request a revision.
// Body: { orderId: string, action: "lock" | "request_revision", note?: string }
// A locked order is immutable: further actions return 409.
export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: { orderId?: string; action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, note } = body;
  const action = body.action as DesignAction;
  if (!orderId || (action !== "lock" && action !== "request_revision")) {
    return NextResponse.json(
      { error: "orderId and a valid action ('lock' | 'request_revision') are required." },
      { status: 400 },
    );
  }

  try {
    const result = await applyDesignAction(session, orderId, action, note);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof DesignActionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
