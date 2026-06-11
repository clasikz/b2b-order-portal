"use client";

import { useTransition } from "react";
import { useTopLoader } from "nextjs-toploader";

// Wraps useTransition so the top progress bar runs for the duration of any async work
// (server actions, fetches), not just link navigation. Use `run(async () => { ... })` in
// place of `startTransition`.
export function useLoaderTransition() {
  const [pending, startTransition] = useTransition();
  const loader = useTopLoader();

  function run(fn: () => Promise<void> | void) {
    loader.start();
    startTransition(async () => {
      try {
        await fn();
      } finally {
        loader.done();
      }
    });
  }

  return [pending, run] as const;
}
