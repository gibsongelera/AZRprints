import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTicketAttachment, type AttachmentColumns } from "@/lib/ticket-files";

/**
 * Post a reply to a ticket (student owner or admin).
 * Body: { body?: string, attachment?: { path, name, size } } — at least one is required.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const text = String(payload.body || "").trim();
  if (!text && !payload.attachment) {
    return NextResponse.json(
      { error: "Write a message or attach a file" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, user_id, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (!isAdmin && ticket.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let attachment: Partial<AttachmentColumns> = {};
  if (payload.attachment) {
    const verified = await verifyTicketAttachment(
      supabase,
      ticket.user_id,
      ticketId,
      payload.attachment
    );
    if (verified.error || !verified.data) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }
    attachment = verified.data;
  }

  const senderRole = isAdmin ? "admin" : "user";

  const { data: message, error: msgError } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_role: senderRole,
      body: text,
      ...attachment,
    })
    .select("*")
    .single();

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  if (!isAdmin && ticket.status === "closed") {
    await supabase
      .from("tickets")
      .update({ status: "open" })
      .eq("id", ticketId);
  }

  return NextResponse.json({ message });
}
