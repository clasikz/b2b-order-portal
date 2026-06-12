"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { markNotificationRead } from "@/app/notifications-actions";

const HOVER_DELAY_MS = 300;

export type NotificationItem = {
  id: string;
  orderId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const router = useRouter();
  const loader = useTopLoader();
  const [open, setOpen] = useState(false);
  // Local read state so a lingered hover clears an item (optimistic), with the server updated
  // in the background. Seeded from the items on first render so the badge shows the real count
  // immediately (no flash to the max value).
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.read).map((i) => i.id)),
  );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync when the server data changes (e.g. after navigation/refresh).
  useEffect(() => {
    setReadIds(new Set(items.filter((i) => i.read).map((i) => i.id)));
  }, [items]);

  // Clean up any pending hover timer on unmount.
  useEffect(() => () => clearHoverTimer(), []);

  function clearHoverTimer() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  // Mark read only if the cursor lingers on the item; cancelled if it leaves first.
  function startHoverRead(id: string) {
    if (readIds.has(id)) return;
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => markRead(id), HOVER_DELAY_MS);
  }

  // Unread that aren't in the fetched list (older than the 20 shown) stay counted; unread
  // within the list reflect live hover-reads.
  const unreadOnLoadInList = items.filter((i) => !i.read).length;
  const hiddenUnread = Math.max(0, unread - unreadOnLoadInList);
  const liveUnreadInList = items.filter((i) => !readIds.has(i.id)).length;
  const badge = hiddenUnread + liveUnreadInList;

  function markRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    void markNotificationRead(id); // background; no await, no nav
  }

  function openOrder(orderId: string | null) {
    setOpen(false);
    if (orderId) {
      loader.start();
      router.push(`/orders/${orderId}`);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={badge > 0 ? `${badge} unread notifications` : "Notifications"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all duration-200 hover:scale-110 hover:bg-canvas hover:text-primary-600 active:scale-95 ${
          badge > 0 ? "text-primary-600" : ""
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
              {badge > 9 ? "9+" : badge}
            </span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
            <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">
              Notifications
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">You're all caught up.</p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {items.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onMouseEnter={() => startHoverRead(n.id)}
                        onMouseLeave={clearHoverTimer}
                        onFocus={() => startHoverRead(n.id)}
                        onBlur={clearHoverTimer}
                        onClick={() => openOrder(n.orderId)}
                        className={`flex w-full flex-col items-start gap-0.5 border-b border-line/70 px-4 py-3 text-left transition-colors last:border-0 hover:bg-canvas ${
                          isUnread ? "bg-primary-50/40" : ""
                        }`}
                      >
                        <span className="flex w-full items-start gap-2.5 content-center">
                          {isUnread && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                          )}
                          <span className="text-sm text-ink flex flex-col gap-y-2">
                            {n.message}
                            <span className="text-xs text-muted">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                        </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
