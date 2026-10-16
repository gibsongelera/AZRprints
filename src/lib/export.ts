"use client";

/*
 * One-click CSV / Excel / PDF exports for tables and dashboard reports.
 * Heavy libraries (write-excel-file, jsPDF) are loaded on demand so they
 * don't slow down normal page loads.
 */

export type ExportValue = string | number | Date | null | undefined;

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => ExportValue;
  type?: "text" | "number" | "currency" | "date" | "datetime";
  /** Excel column width in characters */
  width?: number;
};

export type ExportSummaryItem = { label: string; value: string };
export type ExportChart = { title: string; image: string };

export type ExportSpec<T> = {
  /** base file name without extension or date */
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  summary?: ExportSummaryItem[];
  charts?: ExportChart[];
  sheetName?: string;
};

export type ExportFormat = "csv" | "xlsx" | "pdf";

import type { Cell, Row, Sheet } from "write-excel-file/browser";

const BRAND = "AZR PRINT'S";

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDate(v: ExportValue): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date, withTime: boolean) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

/** Plain-text rendering used by CSV and PDF. `pdf` avoids the ₱ glyph (not in core PDF fonts). */
function textOf<T>(col: ExportColumn<T>, row: T, target: "csv" | "pdf"): string {
  const v = col.value(row);
  if (v == null) return "";
  switch (col.type) {
    case "currency": {
      const n = Number(v) || 0;
      if (target === "csv") return n.toFixed(2);
      return `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case "number":
      return String(Number(v) || 0);
    case "date":
    case "datetime": {
      const d = toDate(v);
      return d ? fmtDate(d, col.type === "datetime") : String(v);
    }
    default:
      return String(v);
  }
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportCSV<T>(spec: ExportSpec<T>) {
  const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  // Block spreadsheet formula injection from user-supplied text (e.g. a file named "=HYPERLINK(...)").
  const safe = (col: ExportColumn<T>, v: string) =>
    col.type === "number" || col.type === "currency" || !/^[=+\-@\t\r]/.test(v) ? v : `'${v}`;
  const lines = [
    spec.columns.map((c) => esc(c.header)).join(","),
    ...spec.rows.map((r) => spec.columns.map((c) => esc(safe(c, textOf(c, r, "csv")))).join(",")),
  ];
  // BOM so Excel opens UTF-8 (₱, ñ) correctly
  saveBlob(
    new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    `${spec.filename}-${stamp()}.csv`
  );
}

export async function exportExcel<T>(spec: ExportSpec<T>) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const header: Cell[] = spec.columns.map((c) => ({
    value: c.header,
    fontWeight: "bold",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
  }));

  const body: Row[] = spec.rows.map((row) =>
    spec.columns.map((c): Cell => {
      const v = c.value(row);
      if (v == null || v === "") return null;
      switch (c.type) {
        case "currency":
          return { value: Number(v) || 0, type: Number, format: '"₱"#,##0.00' };
        case "number":
          return { value: Number(v) || 0, type: Number };
        case "date":
        case "datetime": {
          const d = toDate(v);
          // Excel has no time zones: shift so the sheet shows the viewer's local wall time.
          return d
            ? {
                value: new Date(d.getTime() - d.getTimezoneOffset() * 60000),
                type: Date,
                format: c.type === "date" ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm",
              }
            : { value: String(v), type: String };
        }
        default:
          return { value: String(v), type: String };
      }
    })
  );

  const sheets: Sheet<Blob>[] = [
    {
      data: [header, ...body],
      sheet: (spec.sheetName || "Data").slice(0, 31),
      columns: spec.columns.map((c) => ({
        width: c.width ?? Math.min(40, Math.max(10, c.header.length + 4)),
      })),
      stickyRowsCount: 1,
    },
  ];

  if (spec.summary?.length) {
    sheets.push({
      sheet: "Summary",
      columns: [{ width: 30 }, { width: 24 }],
      data: [
        [{ value: `${BRAND} — ${spec.title}`, fontWeight: "bold" }, null],
        [{ value: spec.subtitle || `Generated ${new Date().toLocaleString()}` }, null],
        [null, null],
        ...spec.summary.map((s): Row => [
          { value: s.label, fontWeight: "bold" },
          { value: s.value },
        ]),
      ],
    });
  }

  await writeXlsxFile(sheets).toFile(`${spec.filename}-${stamp()}.xlsx`);
}

export async function exportPDF<T>(spec: ExportSpec<T>) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const landscape = spec.columns.length > 6 || (spec.charts?.length ?? 0) > 0;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 64, pageW, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(BRAND, margin, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("ZPPSU Printing Services", margin, 46);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 30, { align: "right" });
  y = 92;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(spec.title, margin, y);
  y += 16;
  if (spec.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(spec.subtitle, margin, y);
    y += 14;
  }
  y += 6;

  // KPI summary tiles
  if (spec.summary?.length) {
    const perRow = landscape ? 4 : 3;
    const gap = 8;
    const tileW = (pageW - margin * 2 - gap * (perRow - 1)) / perRow;
    const tileH = 44;
    spec.summary.forEach((s, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = margin + col * (tileW + gap);
      const ty = y + row * (tileH + gap);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, ty, tileW, tileH, 4, 4, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(s.label, x + 8, ty + 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(s.value.replace(/₱/g, "PHP "), x + 8, ty + 33);
    });
    y += Math.ceil(spec.summary.length / perRow) * (tileH + gap) + 6;
  }

  // Charts, two per row, each scaled to fit its cell without distortion
  if (spec.charts?.length) {
    const gap = 16;
    const cellW = (pageW - margin * 2 - gap) / 2;
    const cellH = cellW * 0.5;
    for (let i = 0; i < spec.charts.length; i++) {
      const c = spec.charts[i];
      const col = i % 2;
      if (col === 0 && y + cellH + 24 > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      const x = margin + col * (cellW + gap);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(c.title, x, y + 10);
      try {
        const props = doc.getImageProperties(c.image);
        const scale = Math.min(cellW / props.width, cellH / props.height);
        const w = props.width * scale;
        const h = props.height * scale;
        doc.addImage(c.image, "PNG", x, y + 18, w, h, undefined, "FAST");
      } catch {
        /* skip a chart that failed to render */
      }
      if (col === 1 || i === spec.charts.length - 1) y += cellH + 30;
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 40 },
    head: [spec.columns.map((c) => c.header)],
    body: spec.rows.map((r) => spec.columns.map((c) => textOf(c, r, "pdf"))),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(
      spec.columns
        .map((c, i) => [i, c.type === "currency" || c.type === "number" ? { halign: "right" as const } : {}])
    ),
  });

  if (!spec.rows.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("No records for this selection.", margin, y + 40);
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${BRAND} | ${spec.title}`, margin, pageH - 18);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 18, { align: "right" });
  }

  doc.save(`${spec.filename}-${stamp()}.pdf`);
}

export async function runExport<T>(format: ExportFormat, spec: ExportSpec<T>) {
  if (format === "csv") return exportCSV(spec);
  if (format === "xlsx") return exportExcel(spec);
  return exportPDF(spec);
}
