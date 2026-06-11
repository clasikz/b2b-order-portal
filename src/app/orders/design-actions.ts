"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, AuthError } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { saveImage, MAX_IMAGE_BYTES } from "@/lib/storage";
import { notify } from "@/lib/notifications";

export type DesignResult = { error: string } | { ok: true };

async function assertNotLocked(orderId: string): Promise<DesignResult | null> {
  const lock = await prisma.designLock.findUnique({ where: { orderId } });
  if (lock?.state === "LOCKED") {
    return { error: "Order is locked; the design can no longer be changed." };
  }
  return null;
}

// Client uploads an optional reference image ("here's roughly what we want").
export async function uploadReferenceImage(
  orderId: string,
  dataUrl: string,
  note?: string,
): Promise<DesignResult> {
  return uploadAsset(orderId, dataUrl, "CLIENT_REFERENCE", "design:reference", note);
}

// Designer uploads a proof with an optional note (posted to the thread alongside the version).
export async function uploadDesignProof(
  orderId: string,
  dataUrl: string,
  note?: string,
): Promise<DesignResult> {
  return uploadAsset(orderId, dataUrl, "DESIGNER_PROOF", "design:proof", note);
}

async function uploadAsset(
  orderId: string,
  dataUrl: string,
  kind: "CLIENT_REFERENCE" | "DESIGNER_PROOF",
  permission: "design:reference" | "design:proof",
  note?: string,
): Promise<DesignResult> {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  if (!can(session.role, permission)) return { error: "Forbidden" };
  if (!dataUrl.startsWith("data:image/")) return { error: "Please choose an image file." };
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    return { error: "Image is too large (max ~1.5MB for the demo)." };
  }

  const locked = await assertNotLocked(orderId);
  if (locked) return locked;

  const storedRef = await saveImage(dataUrl);
  await prisma.designAsset.create({
    data: {
      orderId,
      kind,
      storedRef,
      uploaderEmail: session.email,
      uploaderName: session.name,
      uploaderRole: session.role,
    },
  });

  const trimmed = note?.trim();

  // Log the upload to the activity timeline (proofs carry their version + the note).
  if (kind === "DESIGNER_PROOF") {
    const version = await prisma.designAsset.count({
      where: { orderId, kind: "DESIGNER_PROOF" },
    });
    await prisma.auditEvent.create({
      data: {
        orderId,
        actor: session.email,
        eventType: "PROOF_UPLOADED",
        detail: { version, note: trimmed || undefined },
      },
    });
    // Notify the client (the order's club manager) that a new version is ready to review.
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      await notify({
        orderId,
        recipientUserId: order.createdById,
        message: `Design v${version} is ready to review on order ${orderId.slice(0, 8)}.`,
      });
    }
  } else {
    await prisma.auditEvent.create({
      data: { orderId, actor: session.email, eventType: "REFERENCE_UPLOADED" },
    });
  }

  // The note also travels to the conversation thread alongside the upload.
  if (trimmed) {
    await prisma.designComment.create({
      data: {
        orderId,
        authorEmail: session.email,
        authorName: session.name,
        authorRole: session.role,
        body: trimmed,
      },
    });
  }

  // A new designer proof responds to a revision request: move back to "in review" so the
  // client knows there's something fresh to look at.
  if (kind === "DESIGNER_PROOF") {
    await prisma.designLock.updateMany({
      where: { orderId, state: "REVISION_REQUESTED" },
      data: { state: "UNLOCKED", revisionNote: null },
    });
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Request a revision: the client must explain what to change. The note is posted to the
// thread AND flags the design as revision-requested (so the two are connected), in one
// transaction, with an audit event.
export async function requestRevision(orderId: string, note: string): Promise<DesignResult> {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  if (!can(session.role, "design:revision")) return { error: "Forbidden" };

  const text = note.trim();
  if (!text) return { error: "Please describe what needs to change." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { designLock: true },
  });
  if (!order) return { error: "Order not found." };
  if (order.designLock?.state === "LOCKED") {
    return { error: "Order is locked; the design can no longer be changed." };
  }
  if (order.status !== "PENDING_APPROVAL") {
    return { error: "Revisions can only be requested while the design is in review." };
  }

  await prisma.$transaction([
    prisma.designComment.create({
      data: {
        orderId,
        authorEmail: session.email,
        authorName: session.name,
        authorRole: session.role,
        body: text,
      },
    }),
    prisma.designLock.update({
      where: { orderId },
      data: { state: "REVISION_REQUESTED", revisionNote: text },
    }),
    prisma.auditEvent.create({
      data: {
        orderId,
        actor: session.email,
        eventType: "REVISION_REQUESTED",
        detail: { note: text },
      },
    }),
  ]);

  // Notify the design studio that changes were requested.
  await notify({
    orderId,
    recipientRole: "DESIGNER",
    message: `Revision requested on order ${orderId.slice(0, 8)}: “${text}”`,
  });

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// Threaded designer <-> client feedback.
export async function postDesignComment(
  orderId: string,
  body: string,
): Promise<DesignResult> {
  let session;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  if (!can(session.role, "design:comment")) return { error: "Forbidden" };

  const text = body.trim();
  if (!text) return { error: "Comment cannot be empty." };
  if (text.length > 2000) return { error: "Comment is too long." };

  const locked = await assertNotLocked(orderId);
  if (locked) return locked;

  await prisma.designComment.create({
    data: {
      orderId,
      authorEmail: session.email,
      authorName: session.name,
      authorRole: session.role,
      body: text,
    },
  });

  // Notify the other side of the conversation: a designer's comment pings the client (this
  // order's manager); anyone else's pings the design studio.
  const short = orderId.slice(0, 8);
  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  if (session.role === "DESIGNER") {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      await notify({
        orderId,
        recipientUserId: order.createdById,
        message: `New comment from the designer on order ${short}: “${preview}”`,
      });
    }
  } else {
    await notify({
      orderId,
      recipientRole: "DESIGNER",
      message: `New comment from the client on order ${short}: “${preview}”`,
    });
  }

  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
