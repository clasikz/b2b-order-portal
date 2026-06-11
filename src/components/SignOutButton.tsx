"use client";

import { useTopLoader } from "nextjs-toploader";
import { logoutAction } from "@/app/actions";

// Sign-out form that triggers the top progress bar on submit (sign-out is a server action +
// redirect, so the bar wouldn't fire on its own).
export function SignOutButton({ className }: { className?: string }) {
  const loader = useTopLoader();
  return (
    <form action={logoutAction} onSubmit={() => loader.start()}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
