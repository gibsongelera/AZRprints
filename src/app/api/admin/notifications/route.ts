import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import type { NotificationAudience } from "@/lib/types";

const TYPES = ["info", "success", "warning"];
const AUDIENCES: NotificationAudience[] = ["all", "users", "admin"];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 140);
  const message = String(body.message || "").trim().slice(0, 1000);
  const type = TYPES.includes(body.type) ? String(body.type) : "info";
  const audience = (
    AUDIENCES.includes(body.audience) ? body.audience : "all"
  ) as NotificationAudience;
  const rawLink = String(body.link || "").trim();
  // Only allow in-app links (no external redirects from notifications)
  const link = rawLink.startsWith("/") && !rawLink.startsWith("//") ? rawLink : null;

  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  let res = await auth.supabase
    .from("notifications")
    .insert({ title, message, type, user_id: null, audience, link })
    .select("*")
    .single();

  // Database without migration 004: post a plain broadcast instead.
  if (res.error && /audience|link/i.test(res.error.message)) {
    res = await auth.supabase
      .from("notifications")
      .insert({ title, message, type, user_id: null })
      .select("*")
      .single();
  }

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  return NextResponse.json({ notification: res.data });
}

/** Edit an announcement (broadcast). Body: { id, title, message, type, audience } */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }
  const title = String(body.title || "").trim().slice(0, 140);
  const message = String(body.message || "").trim().slice(0, 1000);
  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }
  const patch: Record<string, string> = { title, message };
  if (TYPES.includes(body.type)) patch.type = body.type;
  if (AUDIENCES.includes(body.audience)) patch.audience = body.audience;

  // Personal notifications (order/ticket updates) are records, not announcements.
  const { data, error } = await auth.supabase
    .from("notifications")
    .update(patch)
    .eq("id", id)
    .is("user_id", null)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Announcement not found (or migration 004 not applied yet)" },
      { status: 404 }
    );
  }
  return NextResponse.json({ notification: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const { error, count } = await auth.supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "Notification not found (or migration 004 not applied yet)" },
      { status: 404 }
    );
  }
  return NextResponse.json({ deleted: true });
}
