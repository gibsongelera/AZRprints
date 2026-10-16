import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification, UserRole } from "./types";

/** Broadcast audiences each role should see in their bell / inbox. */
export function audiencesFor(role: UserRole): string[] {
  return role === "admin" ? ["all", "admin"] : ["all", "users"];
}

/** Client-side mirror of the inbox filter (used for realtime inserts). */
export function isInInbox(n: Notification, userId: string, role: UserRole) {
  if (n.user_id) return n.user_id === userId;
  return audiencesFor(role).includes(n.audience || "all");
}

export async function fetchInbox(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  limit = 20
): Promise<{ items: Notification[]; readIds: Set<number>; error?: string }> {
  const audiences = audiencesFor(role).join(",");
  let res = await supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${userId},and(user_id.is.null,audience.in.(${audiences}))`)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Database without migration 004 (no audience column): fall back gracefully.
  if (res.error && /audience/i.test(res.error.message)) {
    res = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  if (res.error) {
    return { items: [], readIds: new Set(), error: res.error.message };
  }

  const items = (res.data as Notification[]) || [];
  const readIds = new Set<number>();
  if (items.length) {
    const reads = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .in(
        "notification_id",
        items.map((n) => n.id)
      );
    if (reads.error) {
      // No read-receipt table yet: treat everything as read so the badge stays quiet.
      items.forEach((n) => readIds.add(n.id));
    } else {
      (reads.data || []).forEach((r: { notification_id: number }) =>
        readIds.add(r.notification_id)
      );
    }
  }
  return { items, readIds };
}

export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  ids: number[]
) {
  if (!ids.length) return;
  await supabase.from("notification_reads").upsert(
    ids.map((id) => ({ notification_id: id, user_id: userId })),
    { onConflict: "notification_id,user_id", ignoreDuplicates: true }
  );
}

/** Delete one of your own personal notifications (RLS blocks broadcasts). */
export async function deleteOwnNotification(
  supabase: SupabaseClient,
  userId: string,
  id: number
): Promise<string | null> {
  const { error, count } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return error.message;
  if (!count) return "This notification can't be deleted. Run migration 004 if this keeps happening.";
  return null;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function toastTypeOf(type: string): "success" | "error" | "info" | "warning" {
  if (type === "success" || type === "warning" || type === "error") return type;
  return "info";
}
