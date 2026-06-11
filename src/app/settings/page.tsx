import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { isErpInMaintenance, isAiMappingEnabled } from "@/lib/settings";
import { AppShell } from "@/components/AppShell";
import { SettingToggle } from "./SettingToggle";
import { toggleErpMaintenance, toggleAiMapping } from "./actions";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "settings:manage")) {
    return (
      <AppShell title="Settings" user={session}>
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          Only a Super Admin can manage system settings. You are signed in as {session.role}.
        </p>
      </AppShell>
    );
  }

  const [maintenance, aiOn] = await Promise.all([isErpInMaintenance(), isAiMappingEnabled()]);
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

  return (
    <AppShell title="Settings" user={session}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <p className="text-sm text-muted">
          System-wide settings for the demo. These simulate operational conditions and toggle
          optional capabilities.
        </p>

        <SettingToggle
          title="ERP maintenance mode"
          description="Simulate the legacy ERP being offline. Sync jobs safely queue and retry until it is back online (see Integration)."
          on={maintenance}
          onLabel="Bring ERP online"
          offLabel="Simulate ERP maintenance"
          action={toggleErpMaintenance}
          danger
        />

        <SettingToggle
          title="AI-assisted column mapping"
          description={
            hasGroqKey
              ? "Use Groq (llama-3.3-70b) to map messy CSV headers when auto-detect can't. Falls back to auto-detect on any error."
              : "Set GROQ_API_KEY in .env to enable. Until then, uploads use deterministic auto-detect only."
          }
          on={aiOn}
          onLabel="Disable AI mapping"
          offLabel="Enable AI mapping"
          action={toggleAiMapping}
        />

        {!hasGroqKey && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            GROQ_API_KEY is not set, so AI mapping will fall back to auto-detect even when
            enabled.
          </p>
        )}
      </div>
    </AppShell>
  );
}
