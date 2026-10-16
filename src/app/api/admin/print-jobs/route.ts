import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

function explain(message: string, code?: string) {
  if (code === "23505") return "This order already has a job waiting or printing.";
  if (/print_jobs|relation .* does not exist|schema cache/i.test(message)) {
    return "The print queue table is missing. Run supabase/migrations/002_print_queue.sql, then try again.";
  }
  if (/row-level security/i.test(message)) {
    return "Admins can't manage print jobs yet. Run migration 004, then try again.";
  }
  return message;
}

/** Recent print jobs with their order, newest first. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("print_jobs")
    .select("*, orders(id, file_name, copies, payment_status, profiles(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  }
  return NextResponse.json({ jobs: data || [] });
}

/** Queue a paid order for printing. Body: { orderId } */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const orderId = String(body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const { data: order } = await auth.supabase
    .from("orders")
    .select("id, copies, status, payment_status, file_path")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "Only paid orders can be sent to the printer." }, { status: 409 });
  }
  if (!order.file_path) {
    return NextResponse.json(
      { error: "This order has no file. Upload one before sending it to the printer." },
      { status: 409 }
    );
  }

  const { data: settings } = await auth.supabase
    .from("printer_settings")
    .select("default_printer_name")
    .eq("id", 1)
    .maybeSingle();

  const { data: job, error } = await auth.supabase
    .from("print_jobs")
    .insert({
      order_id: order.id,
      status: "queued",
      printer_name: settings?.default_printer_name || "",
      copies: order.copies,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: explain(error.message, error.code) }, { status: 409 });
  }

  if (order.status === "pending" || order.status === "completed") {
    await auth.supabase.from("orders").update({ status: "in_progress" }).eq("id", order.id);
  }

  return NextResponse.json({ job });
}
