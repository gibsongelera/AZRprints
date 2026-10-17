"use client";

import { Paperclip } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PendingFile } from "@/components/TicketAttachment";
import { CATEGORY_LABELS, STATUS_LABELS, ticketBadge } from "@/components/TicketThread";
import { useToast } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import {
  newUuid,
  TICKET_FILE_ACCEPT,
  uploadTicketAttachment,
  validateTicketFile,
} from "@/lib/ticket-files";
import type { Ticket, TicketCategory } from "@/lib/types";

async function fetchMyTickets() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as Ticket[]) || [];
}

export default function UserTicketsPage() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyTickets().then((list) => {
      if (!active) return;
      setTickets(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function pickFile(f: File | null) {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    const invalid = validateTicketFile(f.name, f.size);
    if (invalid) {
      toast.error("Can't attach this file", invalid);
      return;
    }
    setFile(f);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() && !file) {
      toast.warning("Add some details", "Describe your issue or attach a file.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session expired. Sign in again.");

      const id = newUuid();
      const attachment = file
        ? await uploadTicketAttachment(supabase, user.id, id, file)
        : undefined;

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, subject, category, message, attachment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create ticket");
      toast.success("Ticket submitted", "Our staff will reply here. You'll get a notification.");
      router.push(`/user/tickets/${json.ticket.id}`);
    } catch (err) {
      toast.error("Ticket not submitted", err instanceof Error ? err.message : undefined);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-pp-border bg-white p-5 space-y-3"
      >
        <h2 className="font-semibold">New ticket</h2>
        <div>
          <label htmlFor="tk-cat" className="block text-sm mb-1">Topic</label>
          <select
            id="tk-cat"
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
        </div>
        <div>
          <label htmlFor="tk-subject" className="block text-sm mb-1">Subject</label>
          <input
            id="tk-subject"
            required
            maxLength={200}
            placeholder="e.g. My printout came out cropped"
            className="w-full min-h-11 rounded-lg border border-pp-border px-3"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="tk-msg" className="block text-sm mb-1">Details</label>
          <textarea
            id="tk-msg"
            placeholder="Describe your issue…"
            className="w-full min-h-24 rounded-lg border border-pp-border px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept={TICKET_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <PendingFile file={file} onRemove={() => setFile(null)} />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-pp-border px-3 text-sm font-medium text-pp-muted hover:border-pp-accent hover:text-pp-accent"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
              Attach a file
            </button>
          )}
          <p className="text-xs text-pp-muted">
            Optional: a screenshot, receipt or document (PDF, Word, Excel, image) up to 10 MB.
            Staff can download it from the ticket.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-pp-accent text-white font-semibold px-4 disabled:opacity-50"
        >
          {submitting ? (file ? "Uploading…" : "Submitting…") : "Submit ticket"}
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
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ticketBadge(t.status)}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span className="text-xs font-medium text-pp-accent">Open chat</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
