"use client";

import { CheckCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationIcon } from "@/components/NotificationIcon";
import { useConfirm, useToast } from "@/components/ui/feedback";
import {
  deleteOwnNotification,
  fetchInbox,
  markNotificationsRead,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import type { Notification, UserRole } from "@/lib/types";

/** Tell the header bell which notifications were just read (no refetch needed). */
function syncBell(readIds: number[]) {
  window.dispatchEvent(new CustomEvent("pp:notifications-read", { detail: { ids: readIds } }));
}

/** Tell the header bell which notifications were deleted. */
function syncBellDeleted(ids: number[]) {
  window.dispatchEvent(new CustomEvent("pp:notifications-deleted", { detail: { ids } }));
}

/** Full-page list of the signed-in user's notifications. */
export function NotificationInbox({ role }: { role: UserRole }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return;
      const res = await fetchInbox(supabase, user.id, role, 100);
      if (!active) return;
      setUserId(user.id);
      setItems(res.items);
      setReadIds(res.readIds);
      setError(res.error || "");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [role]);

  const unread = items.filter((n) => !readIds.has(n.id));

  async function markRead(ids: number[]) {
    if (!userId || !ids.length) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    syncBell(ids);
    await markNotificationsRead(createClient(), userId, ids);
  }

  async function markAll() {
    const count = unread.length;
    await markRead(unread.map((n) => n.id));
    toast.success("Marked as read", `${count} notification${count === 1 ? "" : "s"} cleared.`);
  }

  async function remove(n: Notification) {
    if (!userId) return;
    const ok = await confirm({
      title: "Delete this notification?",
      message: `“${n.title}” will be removed from your notifications.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const err = await deleteOwnNotification(createClient(), userId, n.id);
    if (err) {
      toast.error("Couldn't delete the notification", err);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    syncBellDeleted([n.id]);
    toast.success("Notification deleted");
  }

  if (loading) return <p className="text-pp-muted">Loading notifications…</p>;

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pp-muted">
          {unread.length
            ? `${unread.length} unread of ${items.length}`
            : items.length
              ? "You're all caught up."
              : ""}
        </p>
        <button
          type="button"
          disabled={!unread.length}
          onClick={() => void markAll()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-pp-border bg-white px-3 text-sm font-semibold disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          Mark all as read
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ul className="overflow-hidden rounded-xl border border-pp-border bg-white divide-y divide-pp-border">
        {items.map((n) => {
          const isUnread = !readIds.has(n.id);
          return (
            <li key={n.id} className={`flex items-start ${isUnread ? "bg-red-50/40" : ""}`}>
              <button
                type="button"
                onClick={() => {
                  void markRead([n.id]);
                  if (n.link) router.push(n.link);
                }}
                className="flex min-w-0 flex-1 gap-3 px-4 py-4 text-left hover:bg-slate-50"
              >
                <NotificationIcon type={n.type} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
                      {n.title}
                    </span>
                    <span className="text-xs text-pp-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-pp-muted">{n.message}</span>
                </span>
                {isUnread && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pp-accent" aria-label="Unread" />
                )}
              </button>
              {n.user_id === userId && (
                <button
                  type="button"
                  onClick={() => void remove(n)}
                  aria-label={`Delete notification ${n.title}`}
                  title="Delete"
                  className="m-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-pp-muted hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
        {!items.length && (
          <li className="px-4 py-12 text-center text-sm text-pp-muted">
            No notifications yet. You&apos;ll see order updates, payment
            confirmations and ticket replies here.
          </li>
        )}
      </ul>
    </div>
  );
}
