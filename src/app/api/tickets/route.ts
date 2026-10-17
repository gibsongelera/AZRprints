import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TICKET_BUCKET, verifyTicketAttachment } from "@/lib/ticket-files";
import type { TicketCategory } from "@/lib/types";

const CATEGORIES: TicketCategory[] = [
  "order_issue",
  "payment",
  "printer",
  "report",
  "general",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create a support ticket.
 * Body: { subject, category, message, id?, attachment?: { path, name, size } }
 * When attaching a file the browser uploads it first to
 * ticket-files/<user id>/<id>/..., then sends the pre-generated ticket `id`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const category = String(body.category || "general") as TicketCategory;
  const ticketId = body.id ? String(body.id) : crypto.randomUUID();

  if (!subject) {
    return NextResponse.json({ error: "Add a subject for your ticket" }, { status: 400 });
  }
  if (!message && !body.attachment) {
    return NextResponse.json(
      { error: "Describe your issue or attach a file" },
      { status: 400 }
    );
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!UUID.test(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  let attachment = {};
  if (body.attachment) {
    const verified = await verifyTicketAttachment(
      supabase,
      user.id,
      ticketId,
      body.attachment
    );
    if (verified.error || !verified.data) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }
    attachment = verified.data;
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      id: ticketId,
      user_id: user.id,
      subject: subject.slice(0, 200),
      category,
    })
    .select("*")
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json(
      { error: ticketError?.message || "Could not create ticket" },
      { status: 500 }
    );
  }

  const { error: msgError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "user",
    body: message,
    ...attachment,
  });

  if (msgError) {
    if ("attachment_path" in attachment) {
      await supabase.storage
        .from(TICKET_BUCKET)
        .remove([(attachment as { attachment_path: string }).attachment_path]);
    }
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ ticket });
}
