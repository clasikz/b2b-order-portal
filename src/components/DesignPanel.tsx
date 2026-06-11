"use client";

import { useState } from "react";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { useRouter } from "next/navigation";
import type { LockState, OrderStatus } from "@prisma/client";
import { ImageUploadButton } from "./ImageUploadButton";
import { CommentThread, type CommentItem } from "./CommentThread";
import { Pending } from "./Spinner";
import {
  uploadReferenceImage,
  uploadDesignProof,
  requestRevision,
} from "@/app/orders/design-actions";

export type DesignAsset = {
  id: string;
  storedRef: string;
  uploaderName: string;
  createdAt: string;
};

export function DesignPanel({
  orderId,
  status,
  lockState,
  lockedAt,
  reference,
  proofs,
  comments,
  role,
}: {
  orderId: string;
  status: OrderStatus;
  lockState: LockState;
  lockedAt: string | null;
  reference: DesignAsset | null;
  proofs: DesignAsset[]; // newest first
  comments: CommentItem[];
  role: { isClient: boolean; isDesigner: boolean };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, run] = useLoaderTransition();
  const [revising, setRevising] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  const locked = lockState === "LOCKED";
  const inReview = status === "PENDING_APPROVAL";
  const latestProof = proofs[0] ?? null;
  const olderProofs = proofs.slice(1);

  function approveAndLock() {
    setError("");
    run(async () => {
      const res = await fetch("/api/design-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "lock" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed.");
        return;
      }
      router.refresh();
    });
  }

  function submitRevision() {
    setError("");
    run(async () => {
      const res = await requestRevision(orderId, revisionNote);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setRevisionNote("");
      setRevising(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Design</h2>
        {locked ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
            Locked ✓{lockedAt ? ` · ${new Date(lockedAt).toLocaleDateString()}` : ""}
          </span>
        ) : lockState === "REVISION_REQUESTED" ? (
          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200/70">
            Revision requested
          </span>
        ) : (
          inReview && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70">
              In review
            </span>
          )
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Client reference */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Client reference
          </p>
          {reference ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reference.storedRef}
              alt="Client reference"
              className="h-44 w-full rounded-xl border border-line object-contain"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
              No reference uploaded
            </div>
          )}
          {role.isClient && !locked && (
            <ImageUploadButton
              label={reference ? "Replace reference" : "Upload reference image"}
              action={uploadReferenceImage.bind(null, orderId)}
            />
          )}
        </div>

        {/* Designer proof */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Design proof {proofs.length > 0 && `(v${proofs.length})`}
          </p>
          {latestProof ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={latestProof.storedRef}
              alt="Design proof"
              className="h-44 w-full rounded-xl border border-line object-contain"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
              Awaiting design from the studio
            </div>
          )}
          {role.isDesigner && !locked && (
            <ImageUploadButton
              label={latestProof ? `Upload v${proofs.length + 1}` : "Upload design proof"}
              confirm
              withComment
              confirmLabel={latestProof ? `Submit v${proofs.length + 1}` : "Submit v1"}
              action={uploadDesignProof.bind(null, orderId)}
            />
          )}
          {olderProofs.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium text-primary-600">
                {olderProofs.length} earlier version{olderProofs.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {olderProofs.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.storedRef}
                    alt="Earlier version"
                    title={new Date(p.createdAt).toLocaleString()}
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Client approve / revision actions */}
      {role.isClient && inReview && !locked && (
        <div className="mt-5 border-t border-line pt-4">
          {revising ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">What needs to change?</p>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Describe the changes for the designer…"
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || !revisionNote.trim()}
                  onClick={submitRevision}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:bg-slate-300"
                >
                  {pending ? <Pending label="Sending…" /> : "Send revision request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRevising(false);
                    setRevisionNote("");
                    setError("");
                  }}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-canvas"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setRevising(true)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Request Revision
              </button>
              <button
                type="button"
                disabled={pending || !latestProof}
                title={latestProof ? "" : "Wait for the designer to upload a proof"}
                onClick={approveAndLock}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300"
              >
                Approve &amp; Lock
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
      {role.isClient && status === "DRAFT" && (
        <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
          Submit the order for approval to start the design review with the studio.
        </p>
      )}

      {/* Comment thread */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Conversation
        </p>
        <CommentThread
          orderId={orderId}
          comments={comments}
          canComment={(role.isClient || role.isDesigner) && status !== "DRAFT"}
          locked={locked}
        />
      </div>
    </section>
  );
}
