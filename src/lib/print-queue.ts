import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export async function enqueuePrintJobForOrder(
  admin: AdminClient,
  orderId: string
): Promise<{ queued: boolean; reason?: string; jobId?: string }> {
  const { data: settings } = await admin
    .from("printer_settings")
    .select("auto_print_enabled, direct_print_enabled, default_printer_name")
    .eq("id", 1)
    .maybeSingle();

  if (!settings?.auto_print_enabled || !settings.direct_print_enabled) {
    return { queued: false, reason: "auto_print_disabled" };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status, status, copies")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { queued: false, reason: "order_not_found" };
  if (order.payment_status !== "paid") {
    return { queued: false, reason: "not_paid" };
  }

  const { data: existing } = await admin
    .from("print_jobs")
    .select("id")
    .eq("order_id", orderId)
    .in("status", ["queued", "printing"])
    .maybeSingle();

  if (existing) {
    return { queued: true, jobId: existing.id, reason: "already_queued" };
  }

  const { data: job, error } = await admin
    .from("print_jobs")
    .insert({
      order_id: orderId,
      status: "queued",
      printer_name: settings.default_printer_name || "",
      copies: order.copies,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { queued: false, reason: error?.message || "insert_failed" };
  }

  if (order.status === "pending") {
    await admin
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", orderId);
  }

  return { queued: true, jobId: job.id };
}
