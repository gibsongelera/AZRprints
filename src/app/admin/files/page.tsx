"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { OrderFileActions } from "@/components/OrderFileActions";
import { useToast } from "@/components/ui/feedback";
import type { ExportSpec } from "@/lib/export";
import { formatPHP } from "@/lib/format";
import { matchesSearch, printTypeLabel, type OrderWithProfile } from "@/lib/order-export";
import { createClient } from "@/lib/supabase/client";

async function fetchOrders() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, profiles(name, student_id)")
    .order("created_at", { ascending: false });
  return { list: (data as OrderWithProfile[]) || [], error: error?.message || "" };
}

export default function AdminFilesPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "with_file" | "missing">("all");
  const [preview, setPreview] = useState<{
    orderId: string;
    fileName: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrders().then((res) => {
      if (!active) return;
      setOrders(res.list);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function load() {
    fetchOrders().then((res) => {
      setOrders(res.list);
      setError(res.error);
    });
  }

  const filtered = orders.filter((o) => {
    if (!matchesSearch(o, q)) return false;
    if (filter === "with_file") return !!o.file_path;
    if (filter === "missing") return !o.file_path;
    return true;
  });

  async function openPreview(orderId: string, fileName: string) {
    const lower = fileName.toLowerCase();
    const canEmbed = lower.endsWith(".pdf") || /\.(jpe?g|png|gif|webp)$/i.test(lower);
    // Word files can't be embedded: open a tab right away so pop-up blockers allow it.
    const win = canEmbed ? null : window.open("about:blank", "_blank");
    const res = await fetch(`/api/orders/${orderId}/file`);
    const json = await res.json();
    if (!res.ok) {
      win?.close();
      toast.error("Couldn't open file", json.error);
      return;
    }
    const url = json.url as string;
    if (canEmbed) {
      setPreview({ orderId, fileName, url });
    } else if (win) {
      win.opener = null;
      win.location.href = url;
    }
  }

  const exportSpec = (): ExportSpec<OrderWithProfile> => ({
    filename: "azr-order-files",
    title: "Order files",
    subtitle:
      filter === "with_file" ? "Orders with a file" : filter === "missing" ? "Orders missing a file" : "All orders",
    sheetName: "Files",
    rows: filtered,
    columns: [
      { header: "Order", value: (o) => o.id, width: 20 },
      { header: "Customer", value: (o) => o.profiles?.name || "", width: 22 },
      { header: "Student ID", value: (o) => o.profiles?.student_id || "", width: 16 },
      { header: "File", value: (o) => (o.file_path ? o.file_name : "(missing)"), width: 34 },
      { header: "Type", value: (o) => printTypeLabel(o), width: 16 },
      { header: "Pages", value: (o) => o.pages, type: "number", width: 8 },
      { header: "Amount", value: (o) => o.amount, type: "currency", width: 12 },
      { header: "Uploaded", value: (o) => o.created_at, type: "datetime", width: 18 },
    ],
  });

  if (loading) return <p className="text-pp-muted">Loading files…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label htmlFor="f-search" className="sr-only">Search files</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pp-muted" aria-hidden />
            <input
              id="f-search"
              type="search"
              placeholder="Search order, student or file"
              className="min-h-10 w-64 max-w-full rounded-lg border border-pp-border bg-white pl-9 pr-3 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        <label htmlFor="f-filter" className="sr-only">Filter files</label>
        <select
          id="f-filter"
          className="min-h-10 rounded-lg border border-pp-border bg-white px-3 text-sm"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "all" | "with_file" | "missing")
          }
        >
          <option value="all">All orders</option>
          <option value="with_file">With file</option>
          <option value="missing">Missing file</option>
        </select>
        </div>
        <ExportMenu getSpec={exportSpec} disabled={!filtered.length} />
      </div>

      <div className="rounded-xl border border-pp-border bg-white overflow-hidden">
        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-pp-border">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {o.id}
                  </td>
                  <td className="px-3 py-2">
                    {o.profiles?.name || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    {o.file_path ? (
                      <button
                        type="button"
                        className="text-left text-pp-accent hover:underline truncate max-w-full block"
                        title={o.file_name}
                        onClick={() => void openPreview(o.id, o.file_name)}
                      >
                        {o.file_name}
                      </button>
                    ) : (
                      <span className="text-pp-muted italic">No file</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{formatPHP(o.amount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-pp-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <OrderFileActions
                      orderId={o.id}
                      fileName={o.file_name}
                      hasFile={!!o.file_path}
                      compact
                      onDeleted={() =>
                        setOrders((prev) =>
                          prev.map((row) =>
                            row.id === o.id ? { ...row, file_path: null } : row
                          )
                        )
                      }
                      onReplaced={() => void load()}
                    />
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-pp-muted"
                  >
                    No files found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-xl border border-pp-border bg-white flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-pp-border">
              <div className="min-w-0">
                <div className="font-semibold truncate">{preview.fileName}</div>
                <div className="text-xs text-pp-muted">{preview.orderId}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-9 rounded-lg border border-pp-border px-3 text-sm font-medium inline-flex items-center"
                >
                  Open tab
                </a>
                <button
                  type="button"
                  className="min-h-9 rounded-lg bg-pp-accent px-3 text-sm font-semibold text-white"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[60vh] bg-slate-50">
              {/\.(jpe?g|png|gif|webp)$/i.test(preview.fileName) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.fileName}
                  className="max-h-[70vh] mx-auto object-contain p-4"
                />
              ) : (
                <iframe
                  title={preview.fileName}
                  src={preview.url}
                  className="w-full h-[70vh] border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
