"use client";

import { Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { OrderFileActions } from "@/components/OrderFileActions";
import { useConfirm, useToast } from "@/components/ui/feedback";
import type { ExportSpec } from "@/lib/export";
import { formatPHP } from "@/lib/format";
import {
  matchesSearch,
  ORDER_EXPORT_COLUMNS,
  printTypeLabel,
  type OrderWithProfile,
} from "@/lib/order-export";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function payBadge(status: string) {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

async function fetchOrders() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, profiles(name, student_id)")
    .order("created_at", { ascending: false });
  return { list: (data as OrderWithProfile[]) || [], error: error?.message || "" };
}

export default function AdminOrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [payment, setPayment] = useState<PaymentStatus | "all">("all");

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

  function reload() {
    fetchOrders().then((res) => {
      setOrders(res.list);
      setError(res.error);
    });
  }

  async function updateStatus(id: string, next: OrderStatus) {
    const prev = orders.find((o) => o.id === id)?.status;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: next } : o)));
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (prev) setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: prev } : o)));
      toast.error("Update failed", json.error);
      return;
    }
    toast.success("Order updated", `${id} is now ${STATUS_LABEL[next].toLowerCase()}. The student was notified.`);
  }

  function patchRow(patch: Partial<Order> & { id: string }) {
    setOrders((list) => list.map((o) => (o.id === patch.id ? { ...o, ...patch } : o)));
  }

  function removeRow(id: string) {
    setOrders((list) => list.filter((o) => o.id !== id));
  }

  async function deleteOrder(o: OrderWithProfile) {
    const ok = await confirm({
      title: `Delete order ${o.id}?`,
      message:
        o.payment_status === "paid"
          ? "This order is paid. Deleting it removes the payment from reports and the student's order list, along with its file and print jobs. This can't be undone."
          : "The order, its file and its print jobs will be removed. This can't be undone.",
      confirmLabel: "Delete order",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/orders/${o.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Couldn't delete the order", json.error);
      if (res.status === 409) reload();
      return;
    }
    removeRow(o.id);
    toast.success("Order deleted", o.id);
  }

  const visible = orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (payment === "all" || o.payment_status === payment) &&
      matchesSearch(o, q)
  );

  const exportSpec = (): ExportSpec<OrderWithProfile> => {
    const filters = [
      status !== "all" ? `Job status: ${STATUS_LABEL[status]}` : "",
      payment !== "all" ? `Payment: ${payment === "pending" ? "unpaid" : payment}` : "",
      q ? `Search: “${q}”` : "",
    ].filter(Boolean);
    return {
      filename: "azr-orders",
      title: "Orders",
      subtitle: filters.length ? filters.join(", ") : "All orders",
      sheetName: "Orders",
      rows: visible,
      columns: ORDER_EXPORT_COLUMNS,
      summary: [
        { label: "Orders", value: String(visible.length) },
        {
          label: "Paid revenue",
          value: formatPHP(
            visible
              .filter((o) => o.payment_status === "paid")
              .reduce((s, o) => s + Number(o.amount || 0), 0)
          ),
        },
        { label: "Unpaid", value: String(visible.filter((o) => o.payment_status !== "paid").length) },
      ],
    };
  };

  if (loading) return <p className="text-pp-muted">Loading orders…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative">
            <label htmlFor="o-search" className="sr-only">Search orders</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pp-muted" aria-hidden />
            <input
              id="o-search"
              type="search"
              placeholder="Search order, student or file"
              className="min-h-10 w-64 max-w-full rounded-lg border border-pp-border bg-white pl-9 pr-3 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="o-status">Job status</label>
          <select
            id="o-status"
            className="min-h-10 rounded-lg border border-pp-border bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          >
            <option value="all">All job statuses</option>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="o-pay">Payment</label>
          <select
            id="o-pay"
            className="min-h-10 rounded-lg border border-pp-border bg-white px-3 text-sm"
            value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentStatus | "all")}
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Unpaid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-pp-muted">
            {visible.length} of {orders.length}
          </span>
          <ExportMenu getSpec={exportSpec} disabled={!visible.length} />
        </div>
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
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Job status</th>
                <th className="px-3 py-2">File actions</th>
                <th className="px-3 py-2"><span className="sr-only">Manage</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} className="border-t border-pp-border">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{o.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{o.profiles?.name || "—"}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate" title={o.file_name}>
                    {o.file_path ? o.file_name : <span className="text-pp-muted italic">No file</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-pp-muted">{printTypeLabel(o)}</td>
                  <td className="px-3 py-2 text-right tnum">{formatPHP(o.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${payBadge(o.payment_status)}`}>
                      {o.payment_status === "pending" ? "unpaid" : o.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={`st-${o.id}`}>Job status for {o.id}</label>
                    <select
                      id={`st-${o.id}`}
                      className="min-h-9 rounded-lg border border-pp-border px-2"
                      value={o.status}
                      onChange={(e) => void updateStatus(o.id, e.target.value as OrderStatus)}
                    >
                      {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
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
                          prev.map((row) => (row.id === o.id ? { ...row, file_path: null } : row))
                        )
                      }
                      onReplaced={reload}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailsId(o.id)}
                        className="min-h-8 rounded-lg border border-pp-border bg-white px-2.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteOrder(o)}
                        aria-label={`Delete order ${o.id}`}
                        title="Delete order"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-pp-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-pp-muted">
                    {orders.length ? "No orders match these filters." : "No orders yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailsId && (
        <OrderDetailsModal
          key={detailsId}
          orderId={detailsId}
          onClose={() => setDetailsId(null)}
          onChanged={patchRow}
          onDeleted={removeRow}
        />
      )}
    </div>
  );
}
