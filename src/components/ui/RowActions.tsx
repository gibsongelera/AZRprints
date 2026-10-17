"use client";

import {
  Ban,
  CircleCheck,
  Download,
  Eye,
  FileUp,
  Info,
  LoaderCircle,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

/**
 * One look for every create/read/update/delete action in the app: each kind
 * always uses the same icon and color, in tables (icon + tooltip) and in
 * cards or dialogs (icon + text, `showLabel`).
 */
export type RowActionKind =
  | "view"
  | "details"
  | "download"
  | "upload"
  | "replace"
  | "edit"
  | "delete"
  | "retry"
  | "cancel"
  | "close"
  | "reopen"
  | "print";

type Tone = "sky" | "indigo" | "emerald" | "amber" | "red" | "orange" | "slate" | "violet";

const KINDS: Record<RowActionKind, { icon: LucideIcon; label: string; tone: Tone }> = {
  view: { icon: Eye, label: "View", tone: "sky" },
  details: { icon: Info, label: "Details", tone: "indigo" },
  download: { icon: Download, label: "Download", tone: "emerald" },
  upload: { icon: Upload, label: "Upload file", tone: "emerald" },
  replace: { icon: FileUp, label: "Replace file", tone: "amber" },
  edit: { icon: Pencil, label: "Edit", tone: "amber" },
  delete: { icon: Trash2, label: "Delete", tone: "red" },
  retry: { icon: RotateCcw, label: "Retry", tone: "sky" },
  cancel: { icon: Ban, label: "Cancel", tone: "orange" },
  close: { icon: CircleCheck, label: "Close", tone: "slate" },
  reopen: { icon: RotateCcw, label: "Reopen", tone: "sky" },
  print: { icon: Printer, label: "Send to printer", tone: "violet" },
};

// Full class strings so Tailwind keeps them.
const TONES: Record<Tone, string> = {
  sky: "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100",
  red: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100",
};

export function RowAction({
  kind,
  onClick,
  label,
  ariaLabel,
  busy = false,
  disabled = false,
  showLabel = false,
}: {
  kind: RowActionKind;
  onClick?: () => void;
  /** Visible text / tooltip. Defaults to the kind's label ("Delete", "View"…). */
  label?: string;
  /** Screen-reader name when the tooltip alone is ambiguous, e.g. "Delete order ORD-1". */
  ariaLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  /** Icon + text (cards, dialogs). Default is icon-only with a tooltip (tables). */
  showLabel?: boolean;
}) {
  const spec = KINDS[kind];
  const text = label || spec.label;
  const Icon = busy ? LoaderCircle : spec.icon;
  const off = disabled || busy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      aria-label={showLabel ? ariaLabel : ariaLabel || text}
      aria-busy={busy || undefined}
      className={`group relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg ring-1 ring-inset transition-colors ${
        busy ? "cursor-wait" : disabled ? "cursor-not-allowed opacity-40" : ""
      } ${
        showLabel ? "px-2.5 text-xs font-semibold" : "w-8"
      } ${TONES[spec.tone]}`}
    >
      <Icon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {showLabel ? (
        <span>{text}</span>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-full right-0 z-30 mb-1.5 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block"
        >
          {text}
        </span>
      )}
    </button>
  );
}

/** Row of actions; keeps icons on one line in tables. */
export function RowActions({
  children,
  align = "end",
  wrap = false,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  wrap?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 ${wrap ? "flex-wrap" : "flex-nowrap"} ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      {children}
    </div>
  );
}
