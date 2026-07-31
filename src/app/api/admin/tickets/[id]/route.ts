import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import type { TicketCategory, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const CATEGORIES: TicketCategory[] = [
  "order_issue",
  "payment",
  "printer",
  "report",
  "general",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const patch: { status?: TicketStatus; category?: TicketCategory } = {};

  if (body.status !== undefined) {
    const status = body.status as TicketStatus;
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = status;
  }

  if (body.category !== undefined) {
    const category = body.category as TicketCategory;
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    patch.category = category;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
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
