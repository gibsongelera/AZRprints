"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [error, setError] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notification[]) || []);
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, type }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setTitle("");
    setMessage("");
    await load();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form
        onSubmit={onAdd}
        className="rounded-xl border border-pp-border bg-white p-5 space-y-3"
      >
        <h2 className="font-semibold">Post notification</h2>
        <select
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="info">info</option>
          <option value="success">success</option>
          <option value="warning">warning</option>
        </select>
        <input
          required
          placeholder="Title"
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          required
          placeholder="Message"
          className="w-full min-h-24 rounded-lg border border-pp-border px-3 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4"
        >
          Publish
        </button>
      </form>

      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border border-pp-border bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{n.title}</span>
              <span className="text-xs uppercase text-pp-muted">{n.type}</span>
            </div>
            <p className="text-sm text-pp-muted mt-1">{n.message}</p>
            <p className="text-xs text-pp-muted mt-2">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {!items.length && (
          <p className="text-pp-muted text-sm">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
