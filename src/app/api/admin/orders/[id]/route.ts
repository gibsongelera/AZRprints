import { NextResponse } from "next/server";
import {
  closeCheckoutOrRecordPayment,
  PAID_MEANWHILE,
  removeOrderFile,
} from "@/lib/order-actions";
import { requireAdmin } from "@/lib/require-admin";
import { serviceClientOrError } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";

/** Order details for the admin: customer, payment and print jobs. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const { data: order, error } = await auth.supabase
    .from("orders")
    .select("*, profiles(name, student_id, college, department, phone)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Print queue is optional (migration 002); show the order even without it.
  const { data: jobs } = await auth.supabase
    .from("print_jobs")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ order, jobs: jobs || [] });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status as OrderStatus;
  const allowed: OrderStatus[] = ["pending", "in_progress", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ order: data });
}

/** Delete an order, its print jobs (cascade) and its file. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const { data: order } = await auth.supabase
    .from("orders")
    .select("id, file_path, payment_status, paymongo_link_id")
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: printing } = await auth.supabase
    .from("print_jobs")
    .select("id")
    .eq("order_id", id)
    .eq("status", "printing")
    .limit(1);

  if (printing?.length) {
    return NextResponse.json(
      { error: "This order is printing right now. Wait for the job to finish, then delete it." },
      { status: 409 }
    );
  }

  if (order.paymongo_link_id && order.payment_status !== "paid") {
    const privileged = serviceClientOrError("check the PayMongo payment");
    if ("error" in privileged) return privileged.error;
    if (await closeCheckoutOrRecordPayment(privileged.admin, order)) {
      return NextResponse.json({ error: PAID_MEANWHILE }, { status: 409 });
    }
  }

  const { error, count } = await auth.supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "Order wasn't deleted. Run migration 004 to allow admins to delete orders." },
      { status: 409 }
    );
  }

  await removeOrderFile(auth.supabase, order.file_path);
  return NextResponse.json({ deleted: true });
}
