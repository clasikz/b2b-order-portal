"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postDesignComment } from "@/app/orders/design-actions";
import { Pending } from "./Spinner";
import { useLoaderTransition } from "@/lib/use-loader-transition";

const VISIBLE_LIMIT = 15;

const ROLE_LABEL: Record<string, string> = {
  CLUB_MANAGER: "Client",
  DESIGNER: "Designer",
  WAREHOUSE: "Warehouse",
};

export type CommentItem = {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export function CommentThread({
  orderId,
  comments,
  canComment,
  locked,
}: {
  orderId: string;
  comments: CommentItem[];
  canComment: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, run] = useLoaderTransition();

  const hidden = Math.max(0, comments.length - VISIBLE_LIMIT);
  const visible = showAll ? comments : comments.slice(-VISIBLE_LIMIT);

  function send() {
    setError("");
    run(async () => {
      const res = await postDesignComment(orderId, body);
      if (res && "error" in res) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {hidden > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-xs font-medium text-primary-600 transition hover:opacity-70"
        >
          Show {hidden} older comment{hidden === 1 ? "" : "s"}
        </button>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.authorName} role={c.authorRole} />
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{c.authorName}</span>
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                    {ROLE_LABEL[c.authorRole] ?? c.authorRole}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {locked ? (
        <p className="text-xs text-muted">The design is locked; the thread is closed.</p>
      ) : canComment ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Write a comment…"
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || !body.trim()}
              onClick={send}
              className="w-fit rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:bg-slate-300"
            >
              {pending ? <Pending label="Posting…" /> : "Post comment"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Themed initials avatar. Designer uses the navy brand colour, everyone else the primary tint,
// so the two sides of the conversation read at a glance.
function Avatar({ name, role }: { name: string; role: string }) {
  const designer = role === "DESIGNER";
  return (
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        designer ? "bg-navy text-white" : "bg-primary-50 text-primary-600"
      }`}
    >
      {initials(name)}
    </span>
  );
}
