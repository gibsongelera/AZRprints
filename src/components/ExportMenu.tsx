"use client";

import { ChevronDown, FileDown, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/feedback";
import { useDismiss } from "@/components/ui/useDismiss";
import { runExport, type ExportFormat, type ExportSpec } from "@/lib/export";

const OPTIONS: { format: ExportFormat; label: string; hint: string; icon: typeof Sheet }[] = [
  { format: "csv", label: "CSV", hint: "Plain data, opens anywhere", icon: Sheet },
  { format: "xlsx", label: "Excel (.xlsx)", hint: "Formatted spreadsheet", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF report", hint: "Print-ready, with branding", icon: FileText },
];

const NAMES: Record<ExportFormat, string> = { csv: "CSV", xlsx: "Excel", pdf: "PDF" };

export function ExportMenu<T>({
  getSpec,
  disabled,
  label = "Export",
}: {
  getSpec: () => ExportSpec<T> | Promise<ExportSpec<T>>;
  disabled?: boolean;
  label?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  async function run(format: ExportFormat) {
    setOpen(false);
    setBusy(format);
    try {
      const spec = await getSpec();
      await runExport(format, spec);
      toast.success(
        `Exported to ${NAMES[format]}`,
        `${spec.rows.length} row${spec.rows.length === 1 ? "" : "s"} from ${spec.title}.`
      );
    } catch (e) {
      toast.error("Export failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-pp-border bg-white px-3 text-sm font-semibold text-pp-primary hover:bg-slate-50 disabled:opacity-50"
      >
        <FileDown className="h-4 w-4" aria-hidden />
        {busy ? `Preparing ${NAMES[busy]}…` : label}
        <ChevronDown className="h-4 w-4 text-pp-muted" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="pp-pop absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-pp-border bg-white py-1 shadow-xl"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.format}
              type="button"
              role="menuitem"
              onClick={() => void run(o.format)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <o.icon className="mt-0.5 h-4 w-4 text-pp-accent" aria-hidden />
              <span>
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-pp-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
