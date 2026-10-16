"use client";

import { Paperclip } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ExportMenu } from "@/components/ExportMenu";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TicketThread,
  ticketBadge,
} from "@/components/TicketThread";
import { createClient } from "@/lib/supabase/client";
import type { ExportSpec } from "@/lib/export";
import type { Ticket, TicketStatus } from "@/lib/types";

type AdminTicket = Ticket & {
  profiles?: { name?: string; student_id?: string | null } | null;
};

async function fetchTickets() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, profiles(name, student_id)")
    .order("updated_at", { ascending: false });
  return { list: (data as AdminTicket[]) || [], error: error?.message || "" };
}

function AdminTickets() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const reload = useCallback(() => {
    fetchTickets().then((res) => {
      setTickets(res.list);
      setError(res.error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetchTickets().then((res) => {
      if (!active) return;
      setTickets(res.list);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const visible =
    statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  // The URL (?id=) is the source of truth so notification links open the right ticket.
  const paramId = searchParams.get("id");
  const selectedId =
    (paramId && tickets.some((t) => t.id === paramId) ? paramId : null) ??
    visible[0]?.id ??
    null;

  function select(id: string) {
    router.replace(`/admin/tickets?id=${id}`, { scroll: false });
  }

  const exportSpec = (): ExportSpec<AdminTicket> => ({
    filename: "azr-support-tickets",
    title: "Support tickets",
    subtitle:
      statusFilter === "all" ? "All tickets" : `Status: ${STATUS_LABELS[statusFilter]}`,
    sheetName: "Tickets",
    rows: visible,
    columns: [
      { header: "Subject", value: (t) => t.subject, width: 36 },
      { header: "Student", value: (t) => t.profiles?.name || "", width: 22 },
      { header: "Student ID", value: (t) => t.profiles?.student_id || "", width: 16 },
      { header: "Topic", value: (t) => CATEGORY_LABELS[t.category] || t.category, width: 14 },
      { header: "Status", value: (t) => STATUS_LABELS[t.status] || t.status, width: 12 },
      { header: "Opened", value: (t) => t.created_at, type: "datetime", width: 18 },
      { header: "Last update", value: (t) => t.updated_at, type: "datetime", width: 18 },
    ],
  });

  if (loading) return <p className="text-pp-muted">Loading tickets…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="tk-filter" className="text-sm text-pp-muted">Show</label>
          <select
            id="tk-filter"
            className="min-h-10 rounded-lg border border-pp-border bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
          >
            <option value="all">All tickets ({tickets.length})</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]} ({tickets.filter((t) => t.status === s).length})
              </option>
            ))}
          </select>
        </div>
        <ExportMenu getSpec={exportSpec} disabled={!visible.length} />
      </div>

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
            {visible.map((t) => {
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={active ? "true" : undefined}
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
                        {t.profiles?.name || "—"}, {CATEGORY_LABELS[t.category] || t.category}
                      </div>
                      <div className="text-[11px] text-pp-muted mt-1">
                        {new Date(t.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${ticketBadge(t.status)}`}
                    >
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                </button>
              );
            })}
            {!visible.length && (
              <p className="px-3 py-8 text-center text-sm text-pp-muted">
                No tickets in this view.
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
              onUpdated={reload}
              onDeleted={() => {
                setTickets((list) => list.filter((t) => t.id !== selectedId));
                router.replace("/admin/tickets", { scroll: false });
              }}
            />
          ) : (
            <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted">
              <Paperclip className="mx-auto mb-2 h-6 w-6 text-pp-muted" aria-hidden />
              Select a ticket from the inbox to view the conversation, files and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<p className="text-pp-muted">Loading tickets…</p>}>
      <AdminTickets />
    </Suspense>
  );
}
