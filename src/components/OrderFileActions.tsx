"use client";

import { useRef, useState } from "react";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { RowAction, RowActions } from "@/components/ui/RowActions";

type Props = {
  orderId: string;
  fileName: string;
  hasFile: boolean;
  onDeleted?: () => void;
  onReplaced?: (fileName: string) => void;
  /** Icon buttons with tooltips for tables; otherwise labeled buttons. */
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

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,.doc,.docx,image/*"
      className="hidden"
      onChange={(e) => void replaceFile(e.target.files?.[0] || null)}
    />
  );
  const view = () => void openFile(false);
  const download = () => void openFile(true);
  const pick = () => inputRef.current?.click();
  const remove = () => void deleteFile();

  // Tables: the same slots on every row so the icons line up.
  if (compact) {
    return (
      <RowActions>
        {picker}
        <RowAction
          kind="view"
          label="View file"
          ariaLabel={hasFile ? `View ${fileName}` : "No file to view"}
          disabled={!hasFile || !!busy}
          busy={busy === "view"}
          onClick={view}
        />
        <RowAction
          kind="download"
          label="Download file"
          ariaLabel={hasFile ? `Download ${fileName}` : "No file to download"}
          disabled={!hasFile || !!busy}
          busy={busy === "download"}
          onClick={download}
        />
        {!readOnly && (
          <>
            <RowAction
              kind={hasFile ? "replace" : "upload"}
              ariaLabel={hasFile ? `Replace ${fileName}` : `Upload a file for ${orderId}`}
              disabled={!!busy}
              busy={busy === "replace"}
              onClick={pick}
            />
            <RowAction
              kind="delete"
              label="Delete file"
              ariaLabel={hasFile ? `Delete ${fileName}` : "No file to delete"}
              disabled={!hasFile || !!busy}
              busy={busy === "delete"}
              onClick={remove}
            />
          </>
        )}
      </RowActions>
    );
  }

  // Cards and dialogs: labeled buttons.
  return (
    <RowActions align="start" wrap>
      {picker}
      {hasFile ? (
        <>
          <RowAction kind="view" label="View file" showLabel disabled={!!busy} busy={busy === "view"} onClick={view} />
          <RowAction kind="download" label="Download file" showLabel disabled={!!busy} busy={busy === "download"} onClick={download} />
          {!readOnly && (
            <>
              <RowAction kind="replace" showLabel disabled={!!busy} busy={busy === "replace"} onClick={pick} />
              <RowAction kind="delete" label="Delete file" showLabel disabled={!!busy} busy={busy === "delete"} onClick={remove} />
            </>
          )}
        </>
      ) : readOnly ? (
        <span className="text-xs italic text-pp-muted">No file</span>
      ) : (
        <RowAction kind="upload" showLabel disabled={!!busy} busy={busy === "replace"} onClick={pick} />
      )}
    </RowActions>
  );
}
