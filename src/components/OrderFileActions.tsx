"use client";

import { useRef, useState } from "react";

type Props = {
  orderId: string;
  fileName: string;
  hasFile: boolean;
  onDeleted?: () => void;
  onReplaced?: (fileName: string) => void;
  compact?: boolean;
};

export function OrderFileActions({
  orderId,
  fileName,
  hasFile,
  onDeleted,
  onReplaced,
  compact = false,
}: Props) {
  const [busy, setBusy] = useState<"view" | "download" | "delete" | "replace" | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function openFile(download: boolean) {
    setBusy(download ? "download" : "view");
    try {
      const res = await fetch(
        `/api/orders/${orderId}/file${download ? "?download=1" : ""}`
      );
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Could not open file");
        return;
      }
      window.open(json.url as string, "_blank", "noopener,noreferrer");
    } catch {
      alert("Could not open file");
    } finally {
      setBusy(null);
    }
  }

  async function deleteFile() {
    if (
      !confirm(
        `Delete uploaded file "${fileName}" from order ${orderId}? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch(`/api/orders/${orderId}/file`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Delete failed");
        return;
      }
      onDeleted?.();
    } catch {
      alert("Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function replaceFile(file: File | null) {
    if (!file) return;
    setBusy("replace");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/file`, {
        method: "PUT",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Upload failed");
        return;
      }
      onReplaced?.(json.order?.file_name || file.name);
    } catch {
      alert("Upload failed");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const btn =
    compact
      ? "text-xs font-medium hover:underline disabled:opacity-50"
      : "min-h-9 rounded-lg border border-pp-border bg-white px-3 text-sm font-medium disabled:opacity-50";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : ""}`}>
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
