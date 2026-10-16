"use client";

import { Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { OrderFileActions } from "@/components/OrderFileActions";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/Modal";
import { formatPHP } from "@/lib/format";
import { printTypeLabel } from "@/lib/order-export";
import { isActiveJob, PRINT_JOB_LABEL, printJobBadge } from "@/lib/print-jobs";
import type { Order, OrderStatus, PrintJob, Profile } from "@/lib/types";

type OrderDetails = Order & {
  profiles?: Pick<Profile, "name" | "student_id" | "college" | "department" | "phone"> | null;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

async function fetchDetails(orderId: string) {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: json.error || `Couldn't load the order (error ${res.status}).` };
    return { order: json.order as OrderDetails, jobs: (json.jobs as PrintJob[]) || [] };
  } catch {
    return { error: "Couldn't reach the server. Check your connection and try again." };
  }
}

/**
 * Admin view of one order: customer, file, print and payment details, print jobs,
 * job status, "Send to printer" and delete. Mount with key={orderId}.
 */
export function OrderDetailsModal({
  orderId,
  onClose,
  onChanged,
  onDeleted,
}: {
  orderId: string;
  onClose: () => void;
  /** Called with the updated row after a status, file or print queue change. */
  onChanged: (patch: Partial<Order> & { id: string }) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"delete" | "queue" | "status" | null>(null);

  useEffect(() => {
    let active = true;
    fetchDetails(orderId).then((res) => {
      if (!active) return;
      setOrder(res.order ?? null);
      setJobs(res.jobs ?? []);
      setError(res.error ?? "");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orderId]);

  async function reload() {
    const res = await fetchDetails(orderId);
    if (res.order) {
      setOrder(res.order);
      setJobs(res.jobs ?? []);
      onChanged({
        id: res.order.id,
        status: res.order.status,
        file_name: res.order.file_name,
        file_path: res.order.file_path,
      });
    }
  }

  async function setStatus(next: OrderStatus) {
    if (!order) return;
    setBusy("status");
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast.error("Update failed", json.error);
      return;
    }
    setOrder({ ...order, status: next });
    onChanged({ id: order.id, status: next });
    toast.success("Order updated", `${order.id} is now ${STATUS_LABEL[next].toLowerCase()}. The student was notified.`);
  }

  async function sendToPrinter() {
    if (!order) return;
    setBusy("queue");
    const res = await fetch("/api/admin/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't send to the printer", json.error);
      return;
    }
    toast.success("Sent to the printer", "The print worker will pick it up on its next check.");
    await reload();
  }

  async function onDelete() {
    if (!order) return;
    const paid = order.payment_status === "paid";
    const ok = await confirm({
      title: `Delete order ${order.id}?`,
      message: paid
        ? "This order is paid. Deleting it removes the payment from reports and the student's order list, along with its file and print jobs. This can't be undone."
        : "The order, its file and its print jobs will be removed. This can't be undone.",
      confirmLabel: "Delete order",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't delete the order", json.error);
      if (res.status === 409) await reload();
      return;
    }
    toast.success("Order deleted", order.id);
    onDeleted(order.id);
    onClose();
  }

  const hasActiveJob = jobs.some((j) => isActiveJob(j.status));
  const canQueue = !!order && order.payment_status === "paid" && !!order.file_path && !hasActiveJob;

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={order ? `Order ${order.id}` : "Order details"}
      description={order ? `Placed ${new Date(order.created_at).toLocaleString()}` : undefined}
      size="lg"
      footer={
        order ? (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void onDelete()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:mr-auto"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {busy === "delete" ? "Deleting…" : "Delete order"}
            </button>
            {canQueue && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void sendToPrinter()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pp-border bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" aria-hidden />
                {busy === "queue" ? "Sending…" : "Send to printer"}
              </button>
            )}
            <button
              type="button"
              disabled={!!busy}
              onClick={onClose}
              className="min-h-11 rounded-lg bg-pp-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Done
            </button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <p className="pb-2 text-sm text-pp-muted">Loading order…</p>
      ) : !order ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || "Order not found."}
        </p>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pp-muted">Customer</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-pp-muted">Name</dt>
                <dd className="font-medium">{order.profiles?.name || "—"}</dd>
                <dt className="text-pp-muted">Student ID</dt>
                <dd>{order.profiles?.student_id || "—"}</dd>
                <dt className="text-pp-muted">College</dt>
                <dd>{[order.profiles?.college, order.profiles?.department].filter(Boolean).join(", ") || "—"}</dd>
                <dt className="text-pp-muted">Phone</dt>
                <dd>{order.profiles?.phone || "—"}</dd>
              </dl>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pp-muted">Payment</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-pp-muted">Amount</dt>
                <dd className="font-semibold text-pp-accent tnum">{formatPHP(order.amount)}</dd>
                <dt className="text-pp-muted">Payment</dt>
                <dd className="capitalize">{order.payment_status === "pending" ? "unpaid" : order.payment_status}</dd>
                <dt className="text-pp-muted">PayMongo ref.</dt>
                <dd className="break-all text-xs">{order.paymongo_link_id || "—"}</dd>
              </dl>
            </section>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pp-muted">Print details</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-pp-muted">File</dt>
              <dd className="truncate font-medium" title={order.file_name}>
                {order.file_path ? order.file_name : <span className="italic text-pp-muted">No file</span>}
              </dd>
              <dt className="text-pp-muted">Print type</dt>
              <dd>{printTypeLabel(order)}</dd>
              <dt className="text-pp-muted">Pages × copies</dt>
              <dd>
                {order.pages} × {order.copies}
                {(order.document_pages > 0 || order.photo_pages > 0) &&
                  ` (text pages ${order.document_pages}, photo pages ${order.photo_pages})`}
              </dd>
              {order.content_label && (
                <>
                  <dt className="text-pp-muted">Detected</dt>
                  <dd>{order.content_label}</dd>
                </>
              )}
            </dl>
            <div className="mt-3">
              <OrderFileActions
                orderId={order.id}
                fileName={order.file_name}
                hasFile={!!order.file_path}
                onDeleted={() => void reload()}
                onReplaced={() => void reload()}
              />
            </div>
          </section>

          <section>
            <label htmlFor="od-status" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-pp-muted">
              Job status
            </label>
            <select
              id="od-status"
              disabled={!!busy}
              className="min-h-11 w-full max-w-xs rounded-lg border border-pp-border bg-white px-3"
              value={order.status}
              onChange={(e) => void setStatus(e.target.value as OrderStatus)}
            >
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pp-muted">Print jobs</h3>
            {jobs.length ? (
              <ul className="divide-y divide-pp-border rounded-lg border border-pp-border">
                {jobs.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-xs text-pp-muted">
                        {new Date(j.created_at).toLocaleString()}
                        {j.printer_name ? `, ${j.printer_name}` : ""}, attempt {j.attempts}
                      </span>
                      {j.last_error && <span className="block text-xs text-red-700">{j.last_error}</span>}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${printJobBadge(j.status)}`}>
                      {PRINT_JOB_LABEL[j.status] || j.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-pp-muted">
                {order.payment_status === "paid"
                  ? "Not sent to the printer yet."
                  : "Jobs are created after the order is paid."}
              </p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
