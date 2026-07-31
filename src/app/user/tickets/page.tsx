"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Ticket, TicketCategory } from "@/lib/types";

function badge(status: string) {
  const map: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-slate-100 text-slate-700",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order issue",
  payment: "Payment",
  printer: "Printer",
  report: "Report",
  general: "General",
};

export default function UserTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, category, message }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to create ticket");
      setSubmitting(false);
      return;
    }
    router.push(`/user/tickets/${json.ticket.id}`);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-pp-border bg-white p-5 space-y-3"
      >
        <h2 className="font-semibold">New ticket</h2>
        <select
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
        >
          <option value="general">General</option>
          <option value="order_issue">Order issue</option>
          <option value="payment">Payment</option>
          <option value="printer">Printer</option>
          <option value="report">Report</option>
        </select>
        <input
          required
          placeholder="Subject"
          className="w-full min-h-11 rounded-lg border border-pp-border px-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          required
          placeholder="Describe your issue…"
          className="w-full min-h-24 rounded-lg border border-pp-border px-3 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Submit ticket"}
        </button>
      </form>

      {loading ? (
        <p className="text-pp-muted">Loading tickets…</p>
      ) : !tickets.length ? (
        <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted">
          No tickets yet. Open one above if you need help.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/user/tickets/${t.id}`}
              className="block rounded-xl border border-pp-border bg-white p-4 hover:border-pp-accent transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{t.subject}</div>
                  <div className="text-sm text-pp-muted">
                    {CATEGORY_LABELS[t.category] || t.category}
                  </div>
                  <div className="text-xs text-pp-muted mt-1">
                    Updated {new Date(t.updated_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${badge(t.status)}`}
                  >
                    {t.status}
                  </span>
                  <span className="text-xs font-medium text-pp-accent">
                    Open chat →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
