"use client";

import { useEffect, useState } from "react";
import { OrderFileActions } from "@/components/OrderFileActions";
import { formatPHP } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

export default function AdminFilesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "with_file" | "missing">("all");
  const [preview, setPreview] = useState<{
    orderId: string;
    fileName: string;
    url: string;
  } | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("orders")
      .select("*, profiles(name, student_id)")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "with_file") return !!o.file_path;
    if (filter === "missing") return !o.file_path;
    return true;
  });

  async function openPreview(orderId: string, fileName: string) {
    const res = await fetch(`/api/orders/${orderId}/file`);
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Could not open file");
      return;
    }
    const url = json.url as string;
    const lower = fileName.toLowerCase();
    const canEmbed =
      lower.endsWith(".pdf") ||
      /\.(jpe?g|png|gif|webp)$/i.test(lower);
    if (canEmbed) {
      setPreview({ orderId, fileName, url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) return <p className="text-pp-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pp-muted">
          Manage customer uploads — view, download, replace, or delete files.
        </p>
        <select
          className="min-h-11 rounded-lg border border-pp-border px-3 text-sm"
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
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-pp-border">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {o.id}
                  </td>
                  <td className="px-3 py-2">
                    {(o.profiles as { name?: string } | null)?.name || "—"}
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
