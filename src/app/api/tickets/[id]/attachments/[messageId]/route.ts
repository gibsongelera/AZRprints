import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TICKET_BUCKET } from "@/lib/ticket-files";

/**
 * Returns a short-lived signed URL for a ticket attachment.
 * Allowed for the ticket's student and for admins. Add ?download=1 to force a download.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: ticketId, messageId } = await context.params;

  const [{ data: profile }, { data: ticket }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("tickets").select("id, user_id").eq("id", ticketId).maybeSingle(),
  ]);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (profile?.role !== "admin" && ticket.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: message } = await supabase
    .from("ticket_messages")
    .select("id, attachment_path, attachment_name")
    .eq("id", messageId)
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (!message?.attachment_path) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const { data, error } = await supabase.storage
    .from(TICKET_BUCKET)
    .createSignedUrl(message.attachment_path, 60 * 10, {
      download: download ? message.attachment_name || true : undefined,
    });

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Could not create file link" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    fileName: message.attachment_name,
  });
}
