"use client";

import { Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { PendingFile, TicketAttachment } from "@/components/TicketAttachment";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/Modal";
import { RowAction, RowActions } from "@/components/ui/RowActions";
import { createClient } from "@/lib/supabase/client";
import {
  TICKET_FILE_ACCEPT,
  uploadTicketAttachment,
  validateTicketFile,
} from "@/lib/ticket-files";
import type {
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketStatus,
} from "@/lib/types";

export function ticketBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-slate-100 text-slate-700",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: "Order issue",
  payment: "Payment",
  printer: "Printer",
  report: "Report",
  general: "General",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/**
 * Live chat thread for one ticket. Mount with key={ticketId} so switching
 * tickets starts from a clean state.
 */
export function TicketThread({
  ticketId,
  viewerRole,
  onUpdated,
  onDeleted,
}: {
  ticketId: string;
  viewerRole: "user" | "admin";
  onUpdated?: () => void;
  /** Called after the ticket is deleted; without it the thread goes back to the list. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [userId, setUserId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [editTicketOpen, setEditTicketOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editCategory, setEditCategory] = useState<TicketCategory>("general");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listHref = viewerRole === "admin" ? "/admin/tickets" : "/user/tickets";

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    Promise.all([
      supabase.auth.getUser(),
      supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle(),
      supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
    ]).then(([userRes, ticketRes, msgsRes]) => {
      if (cancelled) return;
      setUserId(userRes.data.user?.id ?? null);
      setLoadError(ticketRes.error?.message || msgsRes.error?.message || "");
      setTicket((ticketRes.data as Ticket) || null);
      setMessages((msgsRes.data as TicketMessage[]) || []);
      setLoading(false);
    });

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const row = payload.new as TicketMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        }
      )
      // Delete events only carry the id, so they can't be filtered by ticket.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "ticket_messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

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

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if ((!text && !file) || sending || !ticket) return;
    setSending(true);
    try {
      const attachment = file
        ? await uploadTicketAttachment(createClient(), ticket.user_id, ticketId, file)
        : undefined;
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, attachment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");
      const msg = json.message as TicketMessage;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (ticket.status === "closed" && viewerRole === "user") {
        setTicket({ ...ticket, status: "open" });
      }
      setBody("");
      setFile(null);
      if (attachment) toast.success("File sent", attachment.name);
      onUpdated?.();
    } catch (err) {
      toast.error("Message not sent", err instanceof Error ? err.message : undefined);
    } finally {
      setSending(false);
    }
  }

  /** Staff: status and topic. */
  async function patchTicket(patch: { status?: TicketStatus; category?: TicketCategory }) {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error("Update failed", json.error);
      return;
    }
    setTicket(json.ticket as Ticket);
    toast.success(
      "Ticket updated",
      patch.status
        ? `Status set to ${STATUS_LABELS[patch.status].toLowerCase()}.`
        : `Category set to ${CATEGORY_LABELS[patch.category!].toLowerCase()}.`
    );
    onUpdated?.();
  }

  /** Student: subject, topic, close or reopen. */
  async function patchOwnTicket(
    patch: { subject?: string; category?: TicketCategory; status?: "open" | "closed" },
    successTitle: string
  ) {
    setTicketBusy(true);
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    setTicketBusy(false);
    if (!res.ok) {
      toast.error("Couldn't update the ticket", json.error);
      return false;
    }
    setTicket(json.ticket as Ticket);
    toast.success(successTitle);
    onUpdated?.();
    return true;
  }

  function openEditTicket() {
    if (!ticket) return;
    setEditSubject(ticket.subject);
    setEditCategory(ticket.category);
    setEditTicketOpen(true);
  }

  async function saveTicket(e: FormEvent) {
    e.preventDefault();
    const ok = await patchOwnTicket(
      { subject: editSubject, category: editCategory },
      "Ticket updated"
    );
    if (ok) setEditTicketOpen(false);
  }

  async function deleteTicket() {
    if (!ticket) return;
    const ok = await confirm({
      title: "Delete this ticket?",
      message: `“${ticket.subject}”, its messages and attached files will be removed. This can't be undone.`,
      confirmLabel: "Delete ticket",
      tone: "danger",
    });
    if (!ok) return;
    setTicketBusy(true);
    const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setTicketBusy(false);
    if (!res.ok) {
      toast.error("Couldn't delete the ticket", json.error);
      return;
    }
    toast.success("Ticket deleted");
    if (onDeleted) onDeleted();
    else router.push(listHref);
  }

  function startEdit(m: TicketMessage) {
    setEditingId(m.id);
    setEditText(m.body);
  }

  async function saveEdit(m: TicketMessage) {
    const text = editText.trim();
    if (text === m.body.trim()) {
      setEditingId(null);
      return;
    }
    setBusyMessageId(m.id);
    const res = await fetch(`/api/tickets/${ticketId}/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyMessageId(null);
    if (!res.ok) {
      toast.error("Message not saved", json.error);
      return;
    }
    const updated = json.message as TicketMessage;
    setMessages((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditingId(null);
    toast.success("Message updated");
  }

  async function deleteMessage(m: TicketMessage) {
    const ok = await confirm({
      title: "Delete this message?",
      message: m.attachment_path
        ? "The message and its attached file will be removed for everyone."
        : "The message will be removed for everyone.",
      confirmLabel: "Delete message",
      tone: "danger",
    });
    if (!ok) return;
    setBusyMessageId(m.id);
    const res = await fetch(`/api/tickets/${ticketId}/messages/${m.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusyMessageId(null);
    if (!res.ok) {
      toast.error("Couldn't delete the message", json.error);
      return;
    }
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    toast.success("Message deleted");
  }

  if (loading) return <p className="text-pp-muted">Loading conversation…</p>;
  if (!ticket) {
    return (
      <div className="rounded-xl border border-pp-border bg-white p-8 text-center text-pp-muted space-y-2">
        <p>Ticket not found.</p>
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        <Link href={listHref} className="inline-block text-sm font-medium text-pp-accent">
          Back to tickets
        </Link>
      </div>
    );
  }

  const hasStaffReply = messages.some((m) => m.sender_role === "admin");
  const isOwner = viewerRole === "user" && userId === ticket.user_id;

  return (
    <div className="flex flex-col gap-3 max-w-3xl min-h-[32rem] lg:min-h-[calc(100vh-9rem)]">
      <div className="rounded-xl border border-pp-border bg-white p-4 space-y-3 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {viewerRole === "user" && (
              <Link href={listHref} className="text-sm text-pp-muted hover:text-pp-accent">
                ← Back to support
              </Link>
            )}
            <h2 className="font-semibold text-lg mt-1 break-words">{ticket.subject}</h2>
            <p className="text-sm text-pp-muted">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${ticketBadge(ticket.status)}`}>
            {STATUS_LABELS[ticket.status] || ticket.status}
          </span>
        </div>

        {viewerRole === "admin" && (
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="t-status">Status</label>
            <select
              id="t-status"
              className="min-h-11 rounded-lg border border-pp-border px-3"
              value={ticket.status}
              onChange={(e) => void patchTicket({ status: e.target.value as TicketStatus })}
            >
              {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="t-category">Category</label>
            <select
              id="t-category"
              className="min-h-11 rounded-lg border border-pp-border px-3"
              value={ticket.category}
              onChange={(e) =>
                void patchTicket({ category: e.target.value as TicketCategory })
              }
            >
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <div className="flex items-center sm:ml-auto">
              <RowAction
                kind="delete"
                label="Delete ticket"
                showLabel
                busy={ticketBusy}
                onClick={() => void deleteTicket()}
              />
            </div>
          </div>
        )}

        {isOwner && (
          <RowActions align="start" wrap>
            <RowAction
              kind="edit"
              label="Edit ticket"
              showLabel
              disabled={ticketBusy}
              onClick={openEditTicket}
            />
            {ticket.status === "closed" ? (
              <RowAction
                kind="reopen"
                label="Reopen ticket"
                showLabel
                disabled={ticketBusy}
                onClick={() => void patchOwnTicket({ status: "open" }, "Ticket reopened")}
              />
            ) : (
              <RowAction
                kind="close"
                label="Close ticket"
                showLabel
                disabled={ticketBusy}
                onClick={() => void patchOwnTicket({ status: "closed" }, "Ticket closed")}
              />
            )}
            {!hasStaffReply && (
              <RowAction
                kind="delete"
                label="Delete ticket"
                showLabel
                disabled={ticketBusy}
                onClick={() => void deleteTicket()}
              />
            )}
          </RowActions>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-pp-border bg-white p-4 space-y-3 min-h-[16rem]">
        {messages.map((m) => {
          const mine = m.sender_role === viewerRole;
          const ownMessage = !!userId && m.sender_id === userId;
          const canDelete = ownMessage || viewerRole === "admin";
          const editing = editingId === m.id;
          const busy = busyMessageId === m.id;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-pp-accent text-white"
                    : "bg-slate-50 border border-pp-border text-pp-primary"
                }`}
              >
                <p className={`text-[11px] font-semibold mb-1 ${mine ? "text-white/80" : "text-pp-muted"}`}>
                  {m.sender_role === "admin" ? "Admin" : "Student"}
                </p>
                {editing ? (
                  <div className="space-y-2">
                    <label htmlFor={`edit-${m.id}`} className="sr-only">Edit message</label>
                    <textarea
                      id={`edit-${m.id}`}
                      rows={3}
                      autoFocus
                      className="w-64 max-w-full rounded-lg border border-pp-border bg-white px-2 py-1.5 text-sm text-pp-primary"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null);
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void saveEdit(m);
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${mine ? "bg-white/15 hover:bg-white/25" : "border border-pp-border bg-white"}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy || (!editText.trim() && !m.attachment_path)}
                        onClick={() => void saveEdit(m)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50 ${mine ? "bg-white text-pp-accent" : "bg-pp-accent text-white"}`}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
                {m.attachment_path && (
                  <TicketAttachment
                    ticketId={ticketId}
                    messageId={m.id}
                    name={m.attachment_name || "attachment"}
                    size={m.attachment_size}
                    inverted={mine}
                  />
                )}
                <p className={`text-[11px] mt-1 ${mine ? "text-white/70" : "text-pp-muted"}`}>
                  {new Date(m.created_at).toLocaleString()}
                  {m.edited_at ? " · edited" : ""}
                </p>
              </div>
              {!editing && (ownMessage || canDelete) && (
                <div className="mt-1">
                  <RowActions align={mine ? "end" : "start"}>
                    {ownMessage && (
                      <RowAction
                        kind="edit"
                        label="Edit message"
                        disabled={busy}
                        onClick={() => startEdit(m)}
                      />
                    )}
                    {canDelete && (
                      <RowAction
                        kind="delete"
                        label="Delete message"
                        busy={busy}
                        onClick={() => void deleteMessage(m)}
                      />
                    )}
                  </RowActions>
                </div>
              )}
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
        className="rounded-xl border border-pp-border bg-white p-3 space-y-2 shrink-0 sticky bottom-0"
      >
        {file && <PendingFile file={file} onRemove={() => setFile(null)} />}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={TICKET_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Attach a file"
            title="Attach a file (PDF, Word, Excel, image… up to 10 MB)"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-pp-border text-pp-muted hover:bg-slate-50 hover:text-pp-accent disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" aria-hidden />
          </button>
          <label htmlFor="t-reply" className="sr-only">Message</label>
          <textarea
            id="t-reply"
            rows={2}
            placeholder={
              viewerRole === "admin" ? "Write a reply to the student…" : "Type a message…"
            }
            className="flex-1 min-h-11 rounded-lg border border-pp-border px-3 py-2"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!body.trim() && !file)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-pp-accent px-4 font-semibold text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{sending ? "Sending…" : "Send reply"}</span>
          </button>
        </div>
      </form>
      {loadError && <p className="text-sm text-amber-700">{loadError}</p>}

      <Modal
        open={editTicketOpen}
        onClose={() => !ticketBusy && setEditTicketOpen(false)}
        title="Edit ticket"
        description="Change the subject or topic so staff can find it faster."
        size="sm"
      >
        <form onSubmit={saveTicket} className="space-y-3 pb-1">
          <div>
            <label htmlFor="et-cat" className="block text-sm mb-1">Topic</label>
            <select
              id="et-cat"
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="et-subject" className="block text-sm mb-1">Subject</label>
            <input
              id="et-subject"
              required
              maxLength={200}
              className="w-full min-h-11 rounded-lg border border-pp-border px-3"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={ticketBusy}
              onClick={() => setEditTicketOpen(false)}
              className="min-h-11 rounded-lg border border-pp-border bg-white px-4 text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ticketBusy || !editSubject.trim()}
              className="min-h-11 rounded-lg bg-pp-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {ticketBusy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
