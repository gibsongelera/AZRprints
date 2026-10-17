"use client";

import { Megaphone, Pencil } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { NotificationIcon } from "@/components/NotificationIcon";
import { NotificationInbox } from "@/components/NotificationInbox";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { RowAction, RowActions } from "@/components/ui/RowActions";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationAudience } from "@/lib/types";

const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  all: "Everyone",
  users: "Students only",
  admin: "Admins only",
};

async function fetchAnnouncements() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  return { items: (data as Notification[]) || [], error: error?.message || "" };
}

function Announcements() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    fetchAnnouncements().then((res) => {
      if (!active) return;
      setItems(res.items);
      setLoading(false);
      if (res.error) toast.error("Couldn't load announcements", res.error);
    });
    return () => {
      active = false;
    };
  }, [toast]);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setMessage("");
    setType("info");
    setAudience("all");
  }

  function startEdit(n: Notification) {
    setEditing(n);
    setTitle(n.title);
    setMessage(n.message);
    setType(n.type === "success" || n.type === "warning" ? n.type : "info");
    setAudience(n.audience || "all");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setPosting(true);
    const res = await fetch("/api/admin/notifications", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing?.id, title, message, type, audience }),
    });
    const json = await res.json().catch(() => ({}));
    setPosting(false);
    if (!res.ok) {
      toast.error(editing ? "Couldn't save changes" : "Couldn't publish", json.error || "Try again.");
      return;
    }
    const saved = json.notification as Notification;
    if (editing) {
      setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      toast.success("Announcement updated");
    } else {
      setItems((prev) => [saved, ...prev]);
      toast.success("Published", `Sent to ${AUDIENCE_LABEL[audience].toLowerCase()}.`);
    }
    resetForm();
  }

  async function onDelete(n: Notification) {
    const ok = await confirm({
      title: "Delete this announcement?",
      message: `“${n.title}” will disappear from everyone's notifications.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/notifications?id=${n.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error("Couldn't delete", json.error || "Try again.");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (editing?.id === n.id) resetForm();
    toast.success("Announcement deleted");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr] items-start">
      <form
        ref={formRef}
        onSubmit={onPublish}
        className={`rounded-xl border bg-white p-5 space-y-3 scroll-mt-20 ${editing ? "border-pp-accent" : "border-pp-border"}`}
      >
        <h2 className="font-semibold">{editing ? "Edit announcement" : "Post an announcement"}</h2>
        {editing && (
          <p className="text-xs text-pp-muted">
            Changes show up in everyone&apos;s notifications. It won&apos;t pop up again as a new alert.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="n-audience" className="block text-sm mb-1">Send to</label>
            <select
              id="n-audience"
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={audience}
              onChange={(e) => setAudience(e.target.value as NotificationAudience)}
            >
              <option value="all">Everyone</option>
              <option value="users">Students only</option>
              <option value="admin">Admins only</option>
            </select>
          </div>
          <div>
            <label htmlFor="n-type" className="block text-sm mb-1">Style</label>
            <select
              id="n-type"
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="info">Information</option>
              <option value="success">Good news</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="n-title" className="block text-sm mb-1">Title</label>
          <input
            id="n-title"
            required
            maxLength={140}
            placeholder="e.g. Shop closes early on Friday"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="n-message" className="block text-sm mb-1">Message</label>
          <textarea
            id="n-message"
            required
            maxLength={1000}
            placeholder="What should people know?"
            className="w-full min-h-24 rounded-lg border border-pp-border px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={posting}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pp-accent px-4 font-semibold text-white disabled:opacity-50"
          >
            {editing ? (
              <Pencil className="h-4 w-4" aria-hidden />
            ) : (
              <Megaphone className="h-4 w-4" aria-hidden />
            )}
            {posting ? (editing ? "Saving…" : "Publishing…") : editing ? "Save changes" : "Publish"}
          </button>
          {editing && (
            <button
              type="button"
              disabled={posting}
              onClick={resetForm}
              className="min-h-11 rounded-lg border border-pp-border bg-white px-4 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h2 className="font-semibold">Published announcements</h2>
        {loading && <p className="text-sm text-pp-muted">Loading…</p>}
        {items.map((n) => (
          <div
            key={n.id}
            className="flex gap-3 rounded-xl border border-pp-border bg-white p-4"
          >
            <NotificationIcon type={n.type} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{n.title}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-pp-muted">
                  {AUDIENCE_LABEL[n.audience || "all"]}
                </span>
              </div>
              <p className="text-sm text-pp-muted mt-1">{n.message}</p>
              <p className="text-xs text-pp-muted mt-2">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            <div className="shrink-0 self-start">
              <RowActions>
                <RowAction
                  kind="edit"
                  label="Edit announcement"
                  ariaLabel={`Edit announcement ${n.title}`}
                  onClick={() => startEdit(n)}
                />
                <RowAction
                  kind="delete"
                  label="Delete announcement"
                  ariaLabel={`Delete announcement ${n.title}`}
                  onClick={() => void onDelete(n)}
                />
              </RowActions>
            </div>
          </div>
        ))}
        {!loading && !items.length && (
          <p className="rounded-xl border border-pp-border bg-white p-6 text-center text-sm text-pp-muted">
            Nothing published yet. Announcements you post appear here and in
            everyone&apos;s bell.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<"inbox" | "announcements">("inbox");
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Notifications" className="inline-flex rounded-lg border border-pp-border bg-white p-1">
        {(
          [
            ["inbox", "My inbox"],
            ["announcements", "Announcements"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-9 rounded-md px-4 text-sm font-semibold ${
              tab === key ? "bg-pp-primary text-white" : "text-pp-muted hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "inbox" ? <NotificationInbox role="admin" /> : <Announcements />}
    </div>
  );
}
