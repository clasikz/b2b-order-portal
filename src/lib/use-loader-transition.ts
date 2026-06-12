"use client";

import { useEffect, useRef, useTransition } from "react";
import { useTopLoader } from "nextjs-toploader";

// Wraps useTransition and drives the top progress bar off the transition's `pending` state.
// This matters because an action usually ends with router.refresh(): that returns immediately
// while the re-fetch/re-render runs in the background, tracked by `pending`. Tying the bar to
// `pending` means it only completes once the page has actually updated, not just when the
// server action returned.
export function useLoaderTransition() {
  const [pending, startTransition] = useTransition();
  const loader = useTopLoader();
  // useTopLoader returns a fresh object each render; keep a stable ref so the effect below only
  // depends on `pending`.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!pending) return;
    loaderRef.current.start();
    // Cleanup runs when `pending` flips back to false (transition settled) or on unmount.
    return () => loaderRef.current.done();
  }, [pending]);

  function run(fn: () => Promise<void> | void) {
    startTransition(async () => {
      await fn();
    });
  }

  return [pending, run] as const;
}
