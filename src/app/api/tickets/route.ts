import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TicketCategory } from "@/lib/types";

const CATEGORIES: TicketCategory[] = [
  "order_issue",
  "payment",
  "printer",
  "report",
  "general",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const category = String(body.category || "general") as TicketCategory;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message required" },
      { status: 400 }
    );
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
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
  });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ ticket });
}
