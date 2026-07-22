import { NextResponse } from "next/server";
import { createCheckoutSession, createPaymentLink } from "@/lib/paymongo";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
      return NextResponse.json(
        { error: error.message || "Could not load order" },
        { status: 500 }
      );
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    if (order.paymongo_checkout_url && order.paymongo_link_id) {
      return NextResponse.json({
        checkoutUrl: order.paymongo_checkout_url,
        linkId: order.paymongo_link_id,
      });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const description = `AZR PRINT'S ${order.id} — ${order.file_name}`;

    let link;
    try {
      link = await createCheckoutSession({
        amountPhp: Number(order.amount),
        description,
        orderId: order.id,
        successUrl: `${appUrl}/user/orders?paid=1&order=${order.id}`,
        cancelUrl: `${appUrl}/user/orders?cancelled=1&order=${order.id}`,
      });
    } catch (sessionErr) {
      // Fallback when QR Ph / Checkout Sessions unavailable on the account
      try {
        link = await createPaymentLink({
          amountPhp: Number(order.amount),
          description,
          remarks: order.id,
        });
      } catch (linkErr) {
        const msg =
          linkErr instanceof Error
            ? linkErr.message
            : sessionErr instanceof Error
              ? sessionErr.message
              : "PayMongo checkout failed";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        paymongo_link_id: link.id,
        paymongo_checkout_url: link.checkoutUrl,
      })
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      checkoutUrl: link.checkoutUrl,
      linkId: link.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
