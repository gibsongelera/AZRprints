"use client";

import { useEffect, useState } from "react";
import { TicketThread } from "@/components/TicketThread";
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

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tickets")
      .select("*, profiles(name, student_id)")
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    const list = (data as Ticket[]) || [];
    setTickets(list);
    setLoading(false);
    setSelectedId((prev) => {
      if (prev && list.some((t) => t.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <p className="text-pp-muted">Loading…</p>;

  return (
    <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-4 items-start">
      <div className="rounded-xl border border-pp-border bg-white overflow-hidden">
        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        <div className="px-3 py-2 border-b border-pp-border bg-slate-50">
          <h2 className="text-sm font-semibold">Inbox</h2>
          <p className="text-xs text-pp-muted">Select a ticket to reply</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-pp-border">
          {tickets.map((t) => {
            const active = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-3 py-3 transition-colors ${
                  active
                    ? "bg-red-50 border-l-4 border-l-pp-accent"
                    : "hover:bg-slate-50 border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{t.subject}</div>
                    <div className="text-xs text-pp-muted truncate mt-0.5">
                      {(t.profiles as { name?: string } | null)?.name || "—"} ·{" "}
                      {CATEGORY_LABELS[t.category] || t.category}
                    </div>
                    <div className="text-[11px] text-pp-muted mt-1">
                      {new Date(t.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge(t.status)}`}
                  >
                    {t.status}
                  </span>
                </div>
              </button>
            );
          })}
          {!tickets.length && (
            <p className="px-3 py-8 text-center text-sm text-pp-muted">
              No tickets yet
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {selectedId ? (
          <TicketThread
            key={selectedId}
            ticketId={selectedId}
            viewerRole="admin"
            onUpdated={() => void load()}
          />
        ) : (
          <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted">
            Select a ticket from the inbox to view the conversation and reply.
          </div>
        )}
      </div>
    </div>
  );
}
