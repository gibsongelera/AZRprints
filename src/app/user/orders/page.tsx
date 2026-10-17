"use client";

import { CreditCard, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import { OrderFileActions } from "@/components/OrderFileActions";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { RowAction, RowActions } from "@/components/ui/RowActions";
import type { ExportSpec } from "@/lib/export";
import { formatPHP } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

function badge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-slate-100 text-slate-700",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export default function UserOrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "warn" | "info";
    text: string;
  } | null>(null);

  async function loadOrders() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data as Order[]) || [];
    setOrders(list);
    return list;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const paidFlag = params.get("paid");
      const cancelledFlag = params.get("cancelled");
      const orderId = params.get("order");

      if (cancelledFlag) {
        setBanner({
          type: "warn",
          text: "Checkout cancelled. You can retry payment with “Pay now” below.",
        });
      }

      // After PayMongo success redirect: verify with PayMongo and mark paid.
      if (paidFlag && orderId) {
        setConfirming(true);
        setBanner({
          type: "info",
          text: "Confirming your payment with PayMongo…",
        });

        try {
          const res = await fetch("/api/orders/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          const text = await res.text();
          let json: {
            ok?: boolean;
            paid?: boolean;
            alreadyPaid?: boolean;
            error?: string;
            order?: Order;
          } = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            /* ignore */
          }

          if (!cancelled) {
            if (json.ok && (json.paid || json.alreadyPaid)) {
              setBanner({
                type: "success",
                text: "Payment received and approved! Your print job is now in progress.",
              });
            } else {
              setBanner({
                type: "warn",
                text:
                  json.error ||
                  "Payment is still pending confirmation. Refresh in a few seconds, or tap Pay now if you did not finish checkout.",
              });
            }
          }

          // Clean query params so refresh doesn't re-confirm forever
          const url = new URL(window.location.href);
          url.searchParams.delete("paid");
          url.searchParams.delete("cancelled");
          url.searchParams.delete("order");
          window.history.replaceState({}, "", url.pathname);
        } catch {
          if (!cancelled) {
            setBanner({
              type: "warn",
              text: "Could not confirm payment automatically. Please refresh this page.",
            });
          }
        } finally {
          if (!cancelled) setConfirming(false);
        }
      }

      if (!cancelled) {
        await loadOrders();
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function payAgain(orderId: string) {
    const res = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const text = await res.text();
    let json: { error?: string; checkoutUrl?: string } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      toast.error("Checkout failed", `The server answered ${res.status}. Try again in a moment.`);
      return;
    }
    if (res.ok && json.checkoutUrl) {
      toast.info("Opening secure checkout…");
      window.location.assign(json.checkoutUrl);
    } else {
      toast.error("Couldn't start checkout", json.error);
    }
  }

  async function cancelOrder(o: Order) {
    const ok = await confirm({
      title: `Cancel order ${o.id}?`,
      message:
        "The shop won't print it and its payment link will stop working. You can delete the order afterwards.",
      confirmLabel: "Yes, cancel order",
      cancelLabel: "No, keep it",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(o.id);
    const res = await fetch(`/api/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error("Couldn't cancel the order", json.error);
      await loadOrders();
      return;
    }
    setOrders((prev) => prev.map((row) => (row.id === o.id ? (json.order as Order) : row)));
    toast.success("Order cancelled", `${o.id} won't be printed.`);
  }

  async function deleteOrder(o: Order) {
    const ok = await confirm({
      title: `Delete order ${o.id}?`,
      message: "The order and its uploaded file will be removed from your list. This can't be undone.",
      confirmLabel: "Delete order",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(o.id);
    const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error("Couldn't delete the order", json.error);
      await loadOrders();
      return;
    }
    setOrders((prev) => prev.filter((row) => row.id !== o.id));
    toast.success("Order deleted", o.id);
  }

  async function refreshConfirm(orderId: string) {
    setConfirming(true);
    setBanner({
      type: "info",
      text: "Checking payment status…",
    });
    try {
      const res = await fetch("/api/orders/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.ok && (json.paid || json.alreadyPaid)) {
        setBanner({
          type: "success",
          text: "Payment received and approved! Your print job is now in progress.",
        });
      } else {
        setBanner({
          type: "warn",
          text: json.error || "Still pending. Try again in a moment.",
        });
      }
      await loadOrders();
    } catch {
      setBanner({
        type: "warn",
        text: "Could not check payment status.",
      });
    } finally {
      setConfirming(false);
    }
  }

  const bannerEl = banner ? (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        banner.type === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : banner.type === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {banner.text}
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {bannerEl}
        <p className="text-pp-muted">Loading orders…</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="space-y-3">
        {bannerEl}
        <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted">
          No orders yet. Create one from New Order.
        </div>
      </div>
    );
  }

  const exportSpec = (): ExportSpec<Order> => ({
    filename: "my-print-orders",
    title: "My print orders",
    sheetName: "Orders",
    rows: orders,
    columns: [
      { header: "Order", value: (o) => o.id, width: 20 },
      { header: "Date", value: (o) => o.created_at, type: "datetime", width: 18 },
      { header: "File", value: (o) => o.file_name, width: 32 },
      { header: "Type", value: (o) => `${o.type}/${o.color}`, width: 14 },
      { header: "Pages", value: (o) => o.pages, type: "number", width: 8 },
      { header: "Copies", value: (o) => o.copies, type: "number", width: 8 },
      { header: "Amount", value: (o) => o.amount, type: "currency", width: 12 },
      { header: "Payment", value: (o) => (o.payment_status === "pending" ? "unpaid" : o.payment_status), width: 10 },
      { header: "Status", value: (o) => o.status.replace("_", " "), width: 12 },
    ],
    summary: [
      { label: "Orders", value: String(orders.length) },
      {
        label: "Total paid",
        value: formatPHP(
          orders
            .filter((o) => o.payment_status === "paid")
            .reduce((s, o) => s + Number(o.amount || 0), 0)
        ),
      },
    ],
  });

  return (
    <div className="space-y-3">
      {bannerEl}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-pp-muted">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
        <ExportMenu getSpec={exportSpec} />
      </div>
      {orders.map((o) => (
        <div
          key={o.id}
          className="rounded-xl border border-pp-border bg-white p-4 flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{o.id}</div>
              <div className="text-sm text-pp-muted">
                {o.file_path ? o.file_name : "No file uploaded"}
              </div>
              <div className="text-xs text-pp-muted mt-1">
                {o.pages} page(s) · {o.copies} copy · {o.type}/{o.color}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge(o.status)}`}>
                {o.status}
              </span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${badge(o.payment_status)}`}
              >
                pay: {o.payment_status}
              </span>
              <span className="font-semibold text-pp-accent">{formatPHP(o.amount)}</span>
              {o.payment_status !== "paid" && o.status !== "cancelled" && (
                <>
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => refreshConfirm(o.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-pp-primary ring-1 ring-inset ring-pp-border hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${confirming ? "animate-spin" : ""}`} aria-hidden />
                    Check payment
                  </button>
                  <button
                    type="button"
                    onClick={() => payAgain(o.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-pp-accent px-3 text-xs font-semibold text-white hover:bg-pp-accent-hover"
                  >
                    <CreditCard className="h-4 w-4" aria-hidden />
                    Pay now
                  </button>
                </>
              )}
              {o.payment_status !== "paid" && (o.status === "pending" || o.status === "cancelled") && (
                <RowActions align="start" wrap>
                  {o.status === "pending" && (
                    <RowAction
                      kind="cancel"
                      label="Cancel order"
                      showLabel
                      disabled={busyId === o.id}
                      onClick={() => void cancelOrder(o)}
                    />
                  )}
                  <RowAction
                    kind="delete"
                    label="Delete order"
                    showLabel
                    disabled={busyId === o.id}
                    onClick={() => void deleteOrder(o)}
                  />
                </RowActions>
              )}
            </div>
          </div>
          <div className="border-t border-pp-border pt-3">
            <OrderFileActions
              orderId={o.id}
              fileName={o.file_name}
              hasFile={!!o.file_path}
              readOnly={o.payment_status === "paid" || o.status === "cancelled"}
              onDeleted={() =>
                setOrders((prev) =>
                  prev.map((row) =>
                    row.id === o.id ? { ...row, file_path: null } : row
                  )
                )
              }
              onReplaced={() => void loadOrders()}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
