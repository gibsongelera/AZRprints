import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAuthorizedOrder(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, file_name, file_path")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return {
      error: NextResponse.json({ error: "Order not found" }, { status: 404 }),
    };
  }

  if (!isAdmin && order.user_id !== user.id) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user, isAdmin, order };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthorizedOrder(id);
  if ("error" in auth && auth.error) return auth.error;

  const { order, supabase } = auth;
  if (!order.file_path) {
    return NextResponse.json({ error: "No file on this order" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "1";

  const { data, error } = await supabase.storage
    .from("order-files")
    .createSignedUrl(order.file_path, 60 * 10, {
      download: download ? order.file_name : undefined,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Could not create file link" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    fileName: order.file_name,
    filePath: order.file_path,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthorizedOrder(id);
  if ("error" in auth && auth.error) return auth.error;

  const { order, supabase } = auth;
  if (!order.file_path) {
    return NextResponse.json({ error: "No file on this order" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from("order-files")
    .remove([order.file_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ file_path: null })
    .eq("id", id)
    .select("id, file_name, file_path")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data, deleted: true });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await getAuthorizedOrder(id);
  if ("error" in auth && auth.error) return auth.error;

  const { order, supabase, user } = auth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

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

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (order.file_path) {
    await supabase.storage.from("order-files").remove([order.file_path]);
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const filePath = `${order.user_id || user.id}/${id}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("order-files")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ file_name: file.name, file_path: filePath })
    .eq("id", id)
    .select("id, file_name, file_path")
    .single();

  if (error) {
    await supabase.storage.from("order-files").remove([filePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
