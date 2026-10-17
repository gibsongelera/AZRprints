"use client";

import { Download, Eye, FileImage, FileSpreadsheet, FileText, Paperclip } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/feedback";
import { extOf, formatBytes } from "@/lib/ticket-files";

function FileKindIcon({ name, className }: { name: string; className: string }) {
  const ext = extOf(name);
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return <FileImage className={className} aria-hidden />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className={className} aria-hidden />;
  }
  if (["pdf", "doc", "docx", "txt", "ppt", "pptx"].includes(ext)) {
    return <FileText className={className} aria-hidden />;
  }
  return <Paperclip className={className} aria-hidden />;
}

/** File card shown inside a chat bubble with View + Download for student and admin. */
export function TicketAttachment({
  ticketId,
  messageId,
  name,
  size,
  inverted = false,
}: {
  ticketId: string;
  messageId: string;
  name: string;
  size?: number | null;
  inverted?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const ext = extOf(name);
  const viewable = ["pdf", "jpg", "jpeg", "png", "webp", "gif", "txt"].includes(ext);

  async function open(download: boolean) {
    setBusy(download ? "download" : "view");
    // Open the tab synchronously so pop-up blockers allow it.
    const win = download ? null : window.open("about:blank", "_blank");
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/attachments/${messageId}${download ? "?download=1" : ""}`
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
        toast.success("Download started", name);
      } else if (win) {
        win.opener = null;
        win.location.href = json.url as string;
      }
    } catch (e) {
      win?.close();
      toast.error("Couldn't open attachment", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  const btn = inverted
    ? "bg-white/15 text-white hover:bg-white/25"
    : "bg-white text-pp-primary border border-pp-border hover:bg-slate-50";

  return (
    <div
      className={`mt-1 flex items-center gap-3 rounded-lg p-2 ${
        inverted ? "bg-black/15" : "bg-white border border-pp-border"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          inverted ? "bg-white/20" : "bg-red-50 text-pp-accent"
        }`}
        aria-hidden
      >
        <FileKindIcon name={name} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={name}>
          {name}
        </p>
        {size ? (
          <p className={`text-[11px] ${inverted ? "text-white/75" : "text-pp-muted"}`}>
            {ext.toUpperCase()}, {formatBytes(size)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        {viewable && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void open(false)}
            aria-label={`View ${name}`}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-60 ${btn}`}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void open(true)}
          aria-label={`Download ${name}`}
          className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold disabled:opacity-60 ${btn}`}
        >
          <Download className="h-4 w-4" aria-hidden />
          {busy === "download" ? "…" : "Download"}
        </button>
      </div>
    </div>
  );
}

/** Selected-but-not-sent file preview with a remove button. */
export function PendingFile({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-pp-border bg-slate-50 px-2 py-1.5 text-sm">
      <FileKindIcon name={file.name} className="h-4 w-4 shrink-0 text-pp-accent" />
      <span className="min-w-0 flex-1 truncate" title={file.name}>
        {file.name}
      </span>
      <span className="shrink-0 text-xs text-pp-muted">{formatBytes(file.size)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded px-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
