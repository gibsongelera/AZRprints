"use client";

import { useEffect, useState } from "react";
import { OrderFileActions } from "@/components/OrderFileActions";
import { formatPHP } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function updateStatus(id: string, status: OrderStatus) {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Update failed");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  if (loading) return <p className="text-pp-muted">Loading…</p>;

  return (
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
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Job status</th>
              <th className="px-3 py-2">File actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-pp-border">
                <td className="px-3 py-2 font-medium whitespace-nowrap">{o.id}</td>
                <td className="px-3 py-2">
                  {(o.profiles as { name?: string } | null)?.name || "—"}
                </td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={o.file_name}>
                  {o.file_path ? o.file_name : (
                    <span className="text-pp-muted italic">No file</span>
                  )}
                </td>
                <td className="px-3 py-2">{formatPHP(o.amount)}</td>
                <td className="px-3 py-2">{o.payment_status}</td>
                <td className="px-3 py-2">
                  <select
                    className="min-h-9 rounded-lg border border-pp-border px-2"
                    value={o.status}
                    onChange={(e) =>
                      updateStatus(o.id, e.target.value as OrderStatus)
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
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
            {!orders.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-pp-muted">
                  No orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
