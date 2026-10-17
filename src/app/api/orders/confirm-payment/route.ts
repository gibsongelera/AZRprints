import { NextResponse } from "next/server";
import { isPaymongoResourcePaid } from "@/lib/paymongo";
import { enqueuePrintJobForOrder } from "@/lib/print-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Confirms payment after PayMongo redirects back to success_url.
 * Needed on localhost (webhooks cannot reach 127.0.0.1) and as a
 * reliable fallback when webhooks are delayed.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { orderId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const orderId = String(body.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        order,
      });
    }

    if (!order.paymongo_link_id) {
      return NextResponse.json(
        { error: "No PayMongo checkout found for this order" },
        { status: 400 }
      );
    }

    // Poll briefly — PayMongo may still be finalizing right after redirect.
    let paid = false;
    let lastErr: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        paid = await isPaymongoResourcePaid(order.paymongo_link_id);
        if (paid) break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "Verify failed";
      }
      if (attempt < 4) await sleep(1200);
    }

    if (!paid) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          error:
            lastErr ||
            "Payment not confirmed yet. If you already paid, wait a moment and refresh.",
          order,
        },
        { status: 202 }
      );
    }

    // Students can't write payment fields (migration 004); PayMongo just
    // confirmed the payment, so the server records it with the service role.
    const admin = createAdminClient();
    const { data: updated, error: updateError } = await admin
      .from("orders")
      .update({
        payment_status: "paid",
        status: "in_progress",
      })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await enqueuePrintJobForOrder(admin, order.id);

    // The "Payment received" notifications for the student and the admins are
    // created by the database trigger in migration 004 (notify_order_events).

    return NextResponse.json({
      ok: true,
      paid: true,
      order: updated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Confirm payment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
