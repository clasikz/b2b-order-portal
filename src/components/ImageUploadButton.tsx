"use client";

import { useRef, useState } from "react";
import { useLoaderTransition } from "@/lib/use-loader-transition";
import { useRouter } from "next/navigation";
import { Pending } from "./Spinner";

type Result = { error: string } | { ok: true };

const COMMENT_PLACEHOLDER = "Add a note about this version (optional)…";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Reads an image file to a data URL and hands it to a server action. With `confirm`, the user
// previews the picked image and explicitly submits it (so a wrong pick doesn't become a saved
// version) - used for designer proofs. Without it, the upload is immediate (client reference).
export function ImageUploadButton({
  label,
  action,
  confirm = false,
  confirmLabel = "Submit",
  withComment = false,
}: {
  label: string;
  action: (dataUrl: string, note?: string) => Promise<Result>;
  confirm?: boolean;
  confirmLabel?: string;
  withComment?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, run] = useLoaderTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setError("");
    const dataUrl = await readAsDataUrl(file);

    if (confirm) {
      setPreview(dataUrl); // wait for explicit submit
      return;
    }
    submit(dataUrl);
  }

  function submit(dataUrl: string) {
    run(async () => {
      const res = await action(dataUrl, withComment ? note : undefined);
      if (res && "error" in res) setError(res.error);
      else {
        setPreview(null);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      {confirm && preview ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selected design preview"
            className="h-40 w-40 rounded-xl border border-line object-contain"
          />
          <p className="text-xs text-muted">Confirm this is the correct design before submitting.</p>
          {withComment && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={COMMENT_PLACEHOLDER}
              className="w-full max-w-sm rounded-xl border border-line bg-canvas px-3 py-2 text-xs focus:border-primary/40 focus:outline-none"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(preview)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
            >
              {pending ? <Pending label="Submitting…" /> : confirmLabel}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              Choose different
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setPreview(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="w-fit rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink disabled:opacity-50"
        >
          {pending ? <Pending label="Uploading…" /> : label}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
