import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOrderAmount } from "@/lib/pricing";
import type { OrderColor, OrderType } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const type = String(form.get("type") || "document") as OrderType;
  const color = String(form.get("color") || "bw") as OrderColor;
  const pages = Math.max(1, parseInt(String(form.get("pages") || "1"), 10) || 1);
  const copies = Math.max(1, parseInt(String(form.get("copies") || "1"), 10) || 1);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (!["document", "photo", "large"].includes(type)) {
    return NextResponse.json({ error: "Invalid print type" }, { status: 400 });
  }
  if (!["bw", "color"].includes(color)) {
    return NextResponse.json({ error: "Invalid color option" }, { status: 400 });
  }

  const { data: pricing, error: pricingError } = await supabase
    .from("pricing")
    .select("*")
    .eq("id", 1)
    .single();

  if (pricingError || !pricing) {
    return NextResponse.json({ error: "Pricing not configured" }, { status: 500 });
  }

  const amount = calculateOrderAmount(pricing, type, color, pages, copies);
  const orderId = `ORD-${Date.now()}`;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const filePath = `${user.id}/${orderId}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("order-files")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 }
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      pages,
      type,
      color,
      copies,
      amount,
      status: "pending",
      payment_status: "pending",
    })
    .select("*")
    .single();

  if (orderError || !order) {
    await supabase.storage.from("order-files").remove([filePath]);
    return NextResponse.json(
      { error: orderError?.message || "Could not create order" },
      { status: 500 }
    );
  }

  return NextResponse.json({ order });
}
