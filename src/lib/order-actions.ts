import type { SupabaseClient } from "@supabase/supabase-js";
import { closePaymongoResource, isPaymongoResourcePaid } from "@/lib/paymongo";
import { enqueuePrintJobForOrder } from "@/lib/print-queue";
import type { Order } from "@/lib/types";

type CheckoutFields = Pick<Order, "id" | "payment_status" | "paymongo_link_id">;

/**
 * Before an unpaid order is cancelled or deleted: if the student already paid
 * on PayMongo, record the payment (service role) and report it; otherwise close
 * the checkout so it can't be paid later. Returns true when the order turned
 * out to be paid, in which case the caller must not cancel or delete it.
 */
export async function closeCheckoutOrRecordPayment(
  admin: SupabaseClient,
  order: CheckoutFields
): Promise<boolean> {
  if (!order.paymongo_link_id || order.payment_status === "paid") return false;

  let paid = false;
  try {
    paid = await isPaymongoResourcePaid(order.paymongo_link_id);
  } catch {
    // PayMongo unreachable or not configured: still try to close the checkout.
  }

  if (paid) {
    await admin
      .from("orders")
      .update({ payment_status: "paid", status: "in_progress" })
      .eq("id", order.id);
    await enqueuePrintJobForOrder(admin, order.id);
    return true;
  }

  await closePaymongoResource(order.paymongo_link_id);
  return false;
}

export const PAID_MEANWHILE =
  "PayMongo shows this order as paid, so it can't be cancelled or deleted. It's now in the print queue.";

/** Remove an order's file from storage. Best effort: the order row is already gone. */
export async function removeOrderFile(supabase: SupabaseClient, filePath: string | null) {
  if (!filePath) return;
  await supabase.storage.from("order-files").remove([filePath]);
}
