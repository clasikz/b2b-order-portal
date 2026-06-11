import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginAccountButton } from "./LoginAccountButton";

const CLIENTS = [
  { email: "manager@northside.test", name: "Northside FC", tier: "Gold · 15% off" },
  { email: "manager@westvalley.test", name: "West Valley", tier: "Silver · 10% off" },
  { email: "manager@southcoast.test", name: "South Coast", tier: "Bronze · 5% off" },
  { email: "manager@taguig.test", name: "Taguig Tigers", tier: "Silver · 10% off" },
];

const INTERNAL = [
  {
    email: "designer@portal.test",
    label: "Designer",
    desc: "Upload design proofs and reply to client feedback.",
  },
  {
    email: "warehouse@portal.test",
    label: "Warehouse",
    desc: "View production-ready orders and operate ERP sync.",
  },
  {
    email: "admin@portal.test",
    label: "Super Admin",
    desc: "See everything; manage ERP and AI-assist settings.",
  },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white">
            BB
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold text-ink">B2B</h1>
            <p className="text-sm text-muted">Order Portal</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted">
          Demo sign-in. Choose an account to continue (mock auth, no passwords).
        </p>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Clients</p>
        <div className="mb-5 flex flex-col gap-2">
          {CLIENTS.map((acct) => (
            <LoginAccountButton key={acct.email} email={acct.email}>
              <button
                type="submit"
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary-50"
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">{acct.name}</span>
                  <span className="text-xs text-muted">Club Manager (client)</span>
                </span>
                <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600">
                  {acct.tier}
                </span>
              </button>
            </LoginAccountButton>
          ))}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Internal</p>
        <div className="flex flex-col gap-2">
          {INTERNAL.map((acct) => (
            <LoginAccountButton key={acct.email} email={acct.email}>
              <button
                type="submit"
                className="flex w-full flex-col items-start rounded-2xl border border-line px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary-50"
              >
                <span className="font-semibold text-ink">{acct.label}</span>
                <span className="text-sm text-muted">{acct.desc}</span>
              </button>
            </LoginAccountButton>
          ))}
        </div>
      </div>
    </main>
  );
}
