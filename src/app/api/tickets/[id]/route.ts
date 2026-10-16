import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeTicketFolder } from "@/lib/ticket-files";
import type { TicketCategory } from "@/lib/types";

const CATEGORIES: TicketCategory[] = ["order_issue", "payment", "printer", "report", "general"];

async function loadTicket(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [{ data: profile }, { data: ticket }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("tickets").select("id, user_id, status").eq("id", id).maybeSingle(),
  ]);

  if (!ticket) {
    return { error: NextResponse.json({ error: "Ticket not found" }, { status: 404 }) };
  }
  const isAdmin = profile?.role === "admin";
  if (!isAdmin && ticket.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user, isAdmin, ticket };
}

/**
 * Student edits their own ticket.
 * Body: { subject?, category?, status?: "open" | "closed" }
 * (Staff use PATCH /api/admin/tickets/[id] for the other statuses.)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const loaded = await loadTicket(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, ticket } = loaded;

  if (ticket.user_id !== user.id) {
    return NextResponse.json({ error: "Only the student who opened the ticket can edit it." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, string> = {};

  if (body.subject !== undefined) {
    const subject = String(body.subject).trim().slice(0, 200);
    if (!subject) {
      return NextResponse.json({ error: "Add a subject for your ticket" }, { status: 400 });
    }
    patch.subject = subject;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    patch.category = body.category;
  }
  if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "closed") {
      return NextResponse.json(
        { error: "You can close or reopen your ticket. Staff set the other statuses." },
        { status: 400 }
      );
    }
    patch.status = body.status;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tickets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ticket: data });
}

/**
 * Delete a ticket with its messages and files.
 * Admins can delete any ticket; students only while staff haven't replied.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const loaded = await loadTicket(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, isAdmin, ticket } = loaded;

  if (!isAdmin) {
    const { count } = await supabase
      .from("ticket_messages")
      .select("id", { count: "exact", head: true })
      .eq("ticket_id", id)
      .eq("sender_role", "admin");
    if (count) {
      return NextResponse.json(
        { error: "Staff already replied, so this ticket is kept. Close it instead." },
        { status: 409 }
      );
    }
  }

  const { error, count } = await supabase
    .from("tickets")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "Ticket wasn't deleted. Run migration 004 to allow deleting tickets." },
      { status: 409 }
    );
  }

  await removeTicketFolder(supabase, ticket.user_id, id);
  return NextResponse.json({ deleted: true });
}
