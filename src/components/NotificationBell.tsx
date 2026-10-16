"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationIcon } from "@/components/NotificationIcon";
import { useToast } from "@/components/ui/feedback";
import { useDismiss } from "@/components/ui/useDismiss";
import {
  fetchInbox,
  isInInbox,
  markNotificationsRead,
  timeAgo,
  toastTypeOf,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import type { Notification, UserRole } from "@/lib/types";

export function NotificationBell({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  const viewAllHref =
    role === "admin" ? "/admin/notifications" : "/user/notifications";

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchInbox(supabase, userId, role).then((res) => {
      if (!active) return;
      setItems(res.items);
      setReadIds(res.readIds);
    });

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          if (!isInInbox(n, userId, role)) return;
          setItems((prev) =>
            prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 30)
          );
          toast({
            type: toastTypeOf(n.type),
            title: n.title,
            message: n.message,
            href: n.link || undefined,
          });
        }
      )
      // Edited announcements update in place (no new popup).
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, ...n } : p)));
        }
      )
      // Delete events only carry the id.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          const id = (payload.old as { id?: number }).id;
          if (id) setItems((prev) => prev.filter((p) => p.id !== id));
        }
      )
      .subscribe();

    // The notifications page reports what it marked as read so the badge updates instantly.
    const onRead = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: number[] }>).detail?.ids || [];
      setReadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    };
    window.addEventListener("pp:notifications-read", onRead);
    const onDeleted = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: number[] }>).detail?.ids || [];
      setItems((prev) => prev.filter((p) => !ids.includes(p.id)));
    };
    window.addEventListener("pp:notifications-deleted", onDeleted);

    return () => {
      active = false;
      window.removeEventListener("pp:notifications-read", onRead);
      window.removeEventListener("pp:notifications-deleted", onDeleted);
      void supabase.removeChannel(channel);
    };
  }, [userId, role, toast]);

  const unread = items.filter((n) => !readIds.has(n.id));

  async function markRead(ids: number[]) {
    if (!ids.length) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    await markNotificationsRead(createClient(), userId, ids);
  }

  async function onItemClick(n: Notification) {
    setOpen(false);
    void markRead([n.id]);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unread.length
            ? `Notifications, ${unread.length} unread`
            : "Notifications"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-pp-primary hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-pp-accent px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="pp-pop fixed inset-x-4 top-16 z-50 overflow-hidden rounded-xl border border-pp-border bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[23rem]">
          <div className="flex items-center justify-between gap-3 border-b border-pp-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-pp-muted">
                {unread.length ? `${unread.length} unread` : "You're all caught up"}
              </p>
            </div>
            <button
              type="button"
              disabled={!unread.length}
              onClick={() => void markRead(unread.map((n) => n.id))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-pp-accent hover:bg-red-50 disabled:text-pp-muted disabled:hover:bg-transparent"
            >
              <CheckCheck className="h-4 w-4" aria-hidden />
              Mark all as read
            </button>
          </div>

          <ul className="max-h-[26rem] divide-y divide-pp-border overflow-y-auto">
            {items.map((n) => {
              const isUnread = !readIds.has(n.id);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void onItemClick(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                      isUnread ? "bg-red-50/40" : ""
                    }`}
                  >
                    <NotificationIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm ${
                          isUnread ? "font-semibold" : "font-medium text-pp-muted"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-pp-muted line-clamp-2">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-pp-muted">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {isUnread && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pp-accent"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                </li>
              );
            })}
            {!items.length && (
              <li className="px-4 py-10 text-center text-sm text-pp-muted">
                No notifications yet. Order updates, payments and ticket replies
                will show up here.
              </li>
            )}
          </ul>

          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="block border-t border-pp-border px-4 py-3 text-center text-sm font-semibold text-pp-primary hover:bg-slate-50"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
