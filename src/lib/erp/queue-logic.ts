// Pure queue decision logic - no DB, fully unit-testable.

export type JobOutcome =
  | { status: "DONE"; nextRetryAt: null; lastError: null }
  | { status: "PENDING"; nextRetryAt: Date; lastError: string }
  | { status: "FAILED"; nextRetryAt: null; lastError: string };

// Exponential backoff with a small base so the demo is watchable (2s, 4s, 8s, ...).
export function backoffMs(attempts: number): number {
  return 2000 * 2 ** Math.max(0, attempts - 1);
}

// Decide a job's next state after an attempt.
// - success -> DONE
// - failure with attempts left -> PENDING (retry after backoff)
// - failure at maxAttempts -> FAILED (dead-letter)
export function decideNextState(
  succeeded: boolean,
  attempts: number, // attempts AFTER incrementing for this try
  maxAttempts: number,
  error: string | null,
  now: Date = new Date(),
): JobOutcome {
  if (succeeded) return { status: "DONE", nextRetryAt: null, lastError: null };
  const reason = error ?? "Unknown error";
  if (attempts >= maxAttempts) {
    return { status: "FAILED", nextRetryAt: null, lastError: reason };
  }
  return {
    status: "PENDING",
    nextRetryAt: new Date(now.getTime() + backoffMs(attempts)),
    lastError: reason,
  };
}

// A job is due if it has no scheduled retry yet or the retry time has passed.
export function isJobDue(nextRetryAt: Date | null, now: Date = new Date()): boolean {
  return nextRetryAt === null || nextRetryAt.getTime() <= now.getTime();
}
