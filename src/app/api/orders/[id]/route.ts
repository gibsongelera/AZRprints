import { NextResponse } from "next/server";
import {
  closeCheckoutOrRecordPayment,
  PAID_MEANWHILE,
  removeOrderFile,
} from "@/lib/order-actions";
import { serviceClientOrError } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

/** Load the signed-in student's own order. */
async function getOwnOrder(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!order) {
    return { error: NextResponse.json({ error: "Order not found" }, { status: 404 }) };
  }
  return { supabase, order: order as Order };
}

/** Make sure the order wasn't paid on PayMongo meanwhile, and close its checkout. */
async function settleCheckout(order: Order) {
  if (!order.paymongo_link_id) return null;
  const privileged = serviceClientOrError("check the PayMongo payment");
  if ("error" in privileged) return privileged.error;
  if (await closeCheckoutOrRecordPayment(privileged.admin, order)) {
    return NextResponse.json({ error: PAID_MEANWHILE }, { status: 409 });
  }
  return null;
}

/** Cancel an unpaid order that hasn't started. Body: { status: "cancelled" } */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getOwnOrder(id);
  if ("error" in auth) return auth.error;
  const { supabase, order } = auth;

  const body = await request.json().catch(() => ({}));
  if (body.status !== "cancelled") {
    return NextResponse.json(
      { error: "Students can only cancel an order. The shop updates the other statuses." },
      { status: 400 }
    );
  }
  if (order.payment_status === "paid" || order.status !== "pending") {
    return NextResponse.json(
      { error: "Only unpaid orders that haven't started printing can be cancelled." },
      { status: 409 }
    );
  }

  const blocked = await settleCheckout(order);
  if (blocked) return blocked;

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ order: data });
}

/** Delete an unpaid order (pending or cancelled) together with its file. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getOwnOrder(id);
  if ("error" in auth) return auth.error;
  const { supabase, order } = auth;

  if (order.payment_status === "paid" || !["pending", "cancelled"].includes(order.status)) {
    return NextResponse.json(
      { error: "Paid orders are kept for your records and can't be deleted." },
      { status: 409 }
    );
  }

  const blocked = await settleCheckout(order);
  if (blocked) return blocked;

  const { error, count } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "This order can't be deleted. Run migration 004 if this keeps happening." },
      { status: 409 }
    );
  }

  await removeOrderFile(supabase, order.file_path);
  return NextResponse.json({ deleted: true });
}
