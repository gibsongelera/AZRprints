"use client";

import { useRef, useState } from "react";
import { useConfirm, useToast } from "@/components/ui/feedback";

type Props = {
  orderId: string;
  fileName: string;
  hasFile: boolean;
  onDeleted?: () => void;
  onReplaced?: (fileName: string) => void;
  compact?: boolean;
  /** Only View and Download (e.g. a student's paid or cancelled order). */
  readOnly?: boolean;
};

export function OrderFileActions({
  orderId,
  fileName,
  hasFile,
  onDeleted,
  onReplaced,
  compact = false,
  readOnly = false,
}: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"view" | "download" | "delete" | "replace" | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function openFile(download: boolean) {
    setBusy(download ? "download" : "view");
    // Open the tab right away so pop-up blockers allow it.
    const win = download ? null : window.open("about:blank", "_blank");
    try {
      const res = await fetch(
        `/api/orders/${orderId}/file${download ? "?download=1" : ""}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not open file");
      if (download) {
        const a = document.createElement("a");
        a.href = json.url as string;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Download started", fileName);
      } else if (win) {
        win.opener = null;
        win.location.href = json.url as string;
      }
    } catch (e) {
      win?.close();
      toast.error("Couldn't open file", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function deleteFile() {
    const ok = await confirm({
      title: "Delete this file?",
      message: `“${fileName}” will be removed from order ${orderId}. This can't be undone.`,
      confirmLabel: "Delete file",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/orders/${orderId}/file`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("File deleted", `${orderId} no longer has a file.`);
      onDeleted?.();
    } catch (e) {
      toast.error("Couldn't delete file", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function replaceFile(file: File | null) {
    if (!file) return;
    if (/\.(docx?)$/i.test(file.name)) {
      toast.warning(
        "PDF is recommended",
        "Word files can print with shifted fonts or margins. Upload a PDF for an exact print."
      );
    }
    setBusy("replace");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/file`, {
        method: "PUT",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      toast.success(hasFile ? "File replaced" : "File uploaded", file.name);
      onReplaced?.(json.order?.file_name || file.name);
    } catch (e) {
      toast.error("Upload failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const btn = compact
    ? "text-xs font-medium hover:underline disabled:opacity-50"
    : "min-h-9 rounded-lg border border-pp-border bg-white px-3 text-sm font-medium disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="hidden"
        onChange={(e) => void replaceFile(e.target.files?.[0] || null)}
      />
      {hasFile ? (
        <>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void openFile(false)}
            className={`${btn} text-pp-accent`}
          >
            {busy === "view" ? "Opening…" : "View"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void openFile(true)}
            className={`${btn} text-pp-primary`}
          >
            {busy === "download" ? "…" : "Download"}
          </button>
          {!readOnly && (
            <>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => inputRef.current?.click()}
                className={`${btn} text-pp-primary`}
              >
                {busy === "replace" ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void deleteFile()}
                className={`${btn} text-red-600`}
              >
                {busy === "delete" ? "…" : "Delete"}
              </button>
            </>
          )}
        </>
      ) : readOnly ? (
        <span className="text-xs italic text-pp-muted">No file</span>
      ) : (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => inputRef.current?.click()}
          className={
            compact
              ? "text-xs font-medium text-pp-accent hover:underline disabled:opacity-50"
              : "min-h-9 rounded-lg bg-pp-accent px-3 text-sm font-medium text-white disabled:opacity-50"
          }
        >
          {busy === "replace" ? "Uploading…" : "Upload file"}
        </button>
      )}
    </div>
  );
}
