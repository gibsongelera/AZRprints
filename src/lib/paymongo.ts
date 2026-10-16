import crypto from "crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret) throw new Error("Missing PAYMONGO_SECRET_KEY");
  return "Basic " + Buffer.from(secret + ":").toString("base64");
}

export interface PayMongoLinkResult {
  id: string;
  checkoutUrl: string;
  referenceNumber?: string;
}

/**
 * Payment methods offered on the hosted checkout, in order of preference.
 * "qrph" is PayMongo's InstaPay QR Ph rail.
 */
const PREFERRED_PAYMENT_METHODS = ["qrph", "gcash", "paymaya", "card"];

/**
 * Business name shown to the payer instead of the PayMongo account owner's
 * personal name. PayMongo falls back to the account's business name when this
 * is omitted. Override with PAYMONGO_STATEMENT_DESCRIPTOR.
 */
export function statementDescriptor(): string {
  return (process.env.PAYMONGO_STATEMENT_DESCRIPTOR || "AZR PRINTS")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, 22);
}

/**
 * Create a PayMongo Checkout Session (preferred over Payment Links because it
 * lets us pin InstaPay/QRPh + GCash and carries order metadata end-to-end).
 * Amount in PHP; PayMongo expects centavos (integer).
 */
export async function createCheckoutSession(opts: {
  amountPhp: number;
  description: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<PayMongoLinkResult> {
  const amountCentavos = Math.round(Number(opts.amountPhp) * 100);
  if (amountCentavos < 100) {
    throw new Error("Minimum PayMongo amount is ₱1.00");
  }

  const descriptor = statementDescriptor();
  const send = (withDescriptor: boolean) =>
    fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                name: opts.description.slice(0, 255),
                amount: amountCentavos,
                currency: "PHP",
                quantity: 1,
              },
            ],
            payment_method_types: PREFERRED_PAYMENT_METHODS,
            description: opts.description.slice(0, 255),
            reference_number: opts.orderId,
            metadata: { order_id: opts.orderId },
            success_url: opts.successUrl,
            cancel_url: opts.cancelUrl,
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            ...(withDescriptor && descriptor
              ? { statement_descriptor: descriptor }
              : {}),
          },
        },
      }),
    });

  let res = await send(true);
  let json = await res.json();
  // If PayMongo rejects the descriptor (format/length rules), retry without it
  // so checkout never breaks because of branding.
  if (
    !res.ok &&
    descriptor &&
    JSON.stringify(json?.errors || "").includes("statement_descriptor")
  ) {
    res = await send(false);
    json = await res.json();
  }
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.title ||
      "PayMongo checkout session creation failed";
    throw new Error(msg);
  }

  const attrs = json.data.attributes;
  if (!attrs.checkout_url) {
    throw new Error("PayMongo did not return a checkout URL");
  }

  return {
    id: json.data.id,
    checkoutUrl: attrs.checkout_url,
    referenceNumber: attrs.reference_number,
  };
}

/** Amount in PHP; PayMongo expects centavos (integer). */
export async function createPaymentLink(opts: {
  amountPhp: number;
  description: string;
  remarks?: string;
}): Promise<PayMongoLinkResult> {
  const amountCentavos = Math.round(Number(opts.amountPhp) * 100);
  if (amountCentavos < 100) {
    throw new Error("Minimum PayMongo amount is ₱1.00");
  }

  const res = await fetch(`${PAYMONGO_API}/links`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: "PHP",
          description: opts.description.slice(0, 255),
          remarks: (opts.remarks || "").slice(0, 255),
        },
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.title ||
      "PayMongo link creation failed";
    throw new Error(msg);
  }

  const attrs = json.data.attributes;
  const checkoutUrl =
    attrs.checkout_url ||
    (attrs.reference_number
      ? `https://pm.link/${attrs.reference_number}`
      : null);

  if (!checkoutUrl) {
    throw new Error("PayMongo did not return a checkout URL");
  }

  return {
    id: json.data.id,
    checkoutUrl,
    referenceNumber: attrs.reference_number,
  };
}

/** Returns true when PayMongo reports the checkout session / link as paid. */
export async function isPaymongoResourcePaid(
  resourceId: string
): Promise<boolean> {
  if (!resourceId) return false;

  const id = resourceId.trim();
  const path = id.startsWith("link_")
    ? `/links/${id}`
    : `/checkout_sessions/${id}`;

  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method: "GET",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.title ||
      "Could not verify PayMongo payment";
    throw new Error(msg);
  }

  const attrs = json?.data?.attributes || {};

  // Payment Links expose a top-level status.
  if (typeof attrs.status === "string") {
    const status = attrs.status.toLowerCase();
    if (status === "paid") return true;
    if (["unpaid", "refunded", "disputed"].includes(status)) return false;
  }

  // Checkout Sessions: payments[] / payment_intent status.
  const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
  if (
    payments.some((p: { attributes?: { status?: string }; status?: string }) => {
      const s = (p?.attributes?.status || p?.status || "").toLowerCase();
      return s === "paid" || s === "succeeded";
    })
  ) {
    return true;
  }

  const intentStatus = String(
    attrs.payment_intent?.attributes?.status ||
      attrs.payment_intent?.status ||
      ""
  ).toLowerCase();
  if (intentStatus === "succeeded" || intentStatus === "paid") return true;

  // Some session payloads nest paid amount / paid_at once settled.
  if (attrs.paid_at || attrs.payments_count > 0) {
    if (attrs.status === "active" && Number(attrs.payments_count) > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Close an unpaid checkout so it can't be paid after its order is cancelled or
 * deleted (Checkout Sessions are expired, Payment Links archived).
 * Best effort: returns false instead of throwing.
 */
export async function closePaymongoResource(resourceId: string): Promise<boolean> {
  const id = (resourceId || "").trim();
  if (!id) return false;
  const path = id.startsWith("link_")
    ? `/links/${id}/archive`
    : `/checkout_sessions/${id}/expire`;
  try {
    const res = await fetch(`${PAYMONGO_API}${path}`, {
      method: "POST",
      headers: { Authorization: authHeader(), Accept: "application/json" },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verify Paymongo-Signature header.
 * Format: t=<timestamp>,te=<test_hmac>,li=<live_hmac>
 * See: https://docs.paymongo.com/docs/developer-tools-webhook-setup-management
 */
export function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    })
  );

  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const candidates = [testSig, liveSig].filter(Boolean) as string[];
  return candidates.some((sig) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(sig)
      );
    } catch {
      return expected === sig;
    }
  });
}
