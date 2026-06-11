import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AppShell } from "@/components/AppShell";
import { RosterUploader } from "./uploader";

export default async function NewRosterPage() {
  const session = await requireSession();
  const allowed = can(session.role, "roster:upload");

  return (
    <AppShell title="Upload roster" user={session}>
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            ← Back to dashboard
          </Link>
          <p className="mt-1 text-sm text-muted">
            {session.club ? session.club.name : "No club"} · creates a Draft order once valid.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          {allowed ? (
            <RosterUploader />
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Only Club Managers can upload rosters. You are signed in as {session.role}.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
