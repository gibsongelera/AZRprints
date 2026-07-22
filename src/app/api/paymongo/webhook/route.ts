import { NextResponse } from "next/server";
import { verifyPaymongoSignature } from "@/lib/paymongo";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function extractOrderId(payload: unknown): string | null {
  const data = payload as {
    data?: {
      attributes?: {
        type?: string;
        data?: {
          attributes?: {
            remarks?: string;
            description?: string;
            metadata?: { order_id?: string };
          };
          id?: string;
        };
      };
    };
  };

  const attrs = data?.data?.attributes?.data?.attributes as
    | {
        remarks?: string;
        description?: string;
        reference_number?: string;
        metadata?: { order_id?: string };
      }
    | undefined;
  if (!attrs) return null;

  if (attrs.metadata?.order_id) return attrs.metadata.order_id;
  if (attrs.reference_number && /^ORD-/.test(attrs.reference_number))
    return attrs.reference_number;
  if (attrs.remarks && /^ORD-/.test(attrs.remarks)) return attrs.remarks;

  const desc = attrs.description || "";
  const match = desc.match(/ORD-\d+/);
  return match ? match[0] : null;
}

function extractLinkId(payload: unknown): string | null {
  const data = payload as {
    data?: {
      attributes?: {
        data?: { id?: string; type?: string };
      };
    };
  };
  const inner = data?.data?.attributes?.data;
  // Works for both Payment Links ("link") and Checkout Sessions ("checkout_session"):
  // we store whichever id PayMongo returned in orders.paymongo_link_id.
  return inner?.id || null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paymongo-Signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  // If webhook secret is configured, require valid signature.
  // During initial setup, allow unsigned test traffic only when secret is empty.
  if (secret) {
    const ok = verifyPaymongoSignature(rawBody, signature, secret);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload as { data?: { attributes?: { type?: string } } })
    ?.data?.attributes?.type;

  const admin = createAdminClient();
  const orderId = extractOrderId(payload);
  const linkId = extractLinkId(payload);

  let query = admin.from("orders").select("id").limit(1);
  if (orderId) {
    query = admin.from("orders").select("id").eq("id", orderId).limit(1);
  } else if (linkId) {
    query = admin
      .from("orders")
      .select("id")
      .eq("paymongo_link_id", linkId)
      .limit(1);
  } else {
    return NextResponse.json({ received: true, matched: false });
  }

  const { data: orders } = await query;
  const order = orders?.[0];
  if (!order) {
    return NextResponse.json({ received: true, matched: false });
  }

  if (
    eventType === "link.payment.paid" ||
    eventType === "payment.paid" ||
    eventType === "checkout_session.payment.paid"
  ) {
    await admin
      .from("orders")
      .update({ payment_status: "paid", status: "in_progress" })
      .eq("id", order.id);

    await admin.from("notifications").insert({
      user_id: null,
      type: "success",
      title: "Payment received",
      message: `PayMongo payment confirmed for ${order.id}.`,
    });
  }

  if (eventType === "payment.failed" || eventType === "link.payment.failed") {
    await admin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id);
  }

  return NextResponse.json({ received: true, matched: true, orderId: order.id });
}
