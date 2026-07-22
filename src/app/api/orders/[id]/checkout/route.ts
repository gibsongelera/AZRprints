import { NextResponse } from "next/server";

/**
 * Legacy path kept so old clients don't hit a Next HTML 404.
 * Prefer POST /api/orders/checkout with JSON { orderId }.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  url.pathname = "/api/orders/checkout";

  const forwarded = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") || "",
    },
    body: JSON.stringify({ orderId: id }),
  });

  const text = await forwarded.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: forwarded.status });
  } catch {
    return NextResponse.json(
      { error: text || "Checkout proxy failed" },
      { status: forwarded.status || 500 }
    );
  }
}
