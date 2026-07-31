"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketStatus,
} from "@/lib/types";

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

export function TicketThread({
  ticketId,
  viewerRole,
  onUpdated,
}: {
  ticketId: string;
  viewerRole: "user" | "admin";
  onUpdated?: () => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const listHref = viewerRole === "admin" ? "/admin/tickets" : "/user/tickets";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    setTicket(null);
    setMessages([]);
    setLoadError("");
    setError("");
    setBody("");

    (async () => {
      const [ticketRes, msgsRes] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle(),
        supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (ticketRes.error) setLoadError(ticketRes.error.message);
      if (msgsRes.error && !ticketRes.error) setLoadError(msgsRes.error.message);
      setTicket((ticketRes.data as Ticket) || null);
      setMessages((msgsRes.data as TicketMessage[]) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const row = payload.new as TicketMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to send");
      setSending(false);
      return;
    }
    const msg = json.message as TicketMessage;
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    if (ticket?.status === "closed" && viewerRole === "user") {
      setTicket({ ...ticket, status: "open" });
    }
    setBody("");
    setSending(false);
    onUpdated?.();
  }

  async function patchTicket(patch: {
    status?: TicketStatus;
    category?: TicketCategory;
  }) {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Update failed");
      return;
    }
    setTicket(json.ticket as Ticket);
    onUpdated?.();
  }

  if (loading) return <p className="text-pp-muted">Loading thread…</p>;
  if (!ticket) {
    return (
      <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted space-y-2">
        <p>Ticket not found.</p>
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-3xl min-h-[32rem] lg:min-h-[calc(100vh-9rem)]">
      <div className="rounded-xl border border-pp-border bg-white p-4 space-y-3 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {viewerRole === "user" && (
              <Link
                href={listHref}
                className="text-sm text-pp-muted hover:text-pp-accent"
              >
                ← Back
              </Link>
            )}
            <h2 className="font-semibold text-lg mt-1">{ticket.subject}</h2>
            <p className="text-sm text-pp-muted">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${badge(ticket.status)}`}
          >
            {ticket.status}
          </span>
        </div>
        {viewerRole === "admin" && (
          <div className="flex flex-wrap gap-2">
            <select
              className="min-h-11 rounded-lg border border-pp-border px-3"
              value={ticket.status}
              onChange={(e) =>
                void patchTicket({ status: e.target.value as TicketStatus })
              }
            >
              <option value="open">open</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
            <select
              className="min-h-11 rounded-lg border border-pp-border px-3"
              value={ticket.category}
              onChange={(e) =>
                void patchTicket({
                  category: e.target.value as TicketCategory,
                })
              }
            >
              <option value="order_issue">order_issue</option>
              <option value="payment">payment</option>
              <option value="printer">printer</option>
              <option value="report">report</option>
              <option value="general">general</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-pp-border bg-white p-4 space-y-3 min-h-[16rem]">
        {messages.map((m) => {
          const mine = m.sender_role === viewerRole;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-pp-accent text-white"
                    : "bg-slate-50 border border-pp-border text-pp-primary"
                }`}
              >
                <p
                  className={`text-[10px] font-semibold mb-1 ${
                    mine ? "text-white/80" : "text-pp-muted"
                  }`}
                >
                  {m.sender_role === "admin" ? "Admin" : "Student"}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "text-white/70" : "text-pp-muted"
                  }`}
                >
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {!messages.length && (
          <p className="text-sm text-pp-muted text-center py-8">
            No messages yet. Send the first reply below.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="rounded-xl border border-pp-border bg-white p-3 flex flex-col sm:flex-row gap-2 shrink-0 sticky bottom-0"
      >
        <textarea
          required
          rows={2}
          placeholder={
            viewerRole === "admin"
              ? "Write a reply to the student…"
              : "Type a message…"
          }
          className="flex-1 min-h-11 rounded-lg border border-pp-border px-3 py-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send reply"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loadError && <p className="text-sm text-amber-700">{loadError}</p>}
    </div>
  );
}
