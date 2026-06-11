"use client";

import { useTopLoader } from "nextjs-toploader";
import { loginAs } from "./actions";

// Wraps a demo account in a form that triggers the top loader on submit, so the bar shows
// during the (server-action) sign-in + redirect, not just on plain link navigation.
export function LoginAccountButton({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const loader = useTopLoader();
  return (
    <form action={loginAs} onSubmit={() => loader.start()}>
      <input type="hidden" name="email" value={email} />
      {children}
    </form>
  );
}
