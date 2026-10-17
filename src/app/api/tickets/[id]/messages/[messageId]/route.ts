import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TICKET_BUCKET } from "@/lib/ticket-files";

async function loadMessage(ticketId: string, messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // RLS only returns messages of tickets this user may see.
  const [{ data: profile }, { data: message }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, ticket_id, sender_id, body, attachment_path")
      .eq("id", messageId)
      .eq("ticket_id", ticketId)
      .maybeSingle(),
  ]);

  if (!message) {
    return { error: NextResponse.json({ error: "Message not found" }, { status: 404 }) };
  }
  return { supabase, user, isAdmin: profile?.role === "admin", message };
}

/** Edit the text of your own message. Body: { body } */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await context.params;
  const loaded = await loadMessage(id, messageId);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, message } = loaded;

  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const text = String(payload.body ?? "").trim();
  if (!text && !message.attachment_path) {
    return NextResponse.json(
      { error: "A message can't be empty. Delete it instead." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("ticket_messages")
    .update({ body: text })
    .eq("id", messageId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Message wasn't updated. Run migration 004 to allow editing messages." },
      { status: 409 }
    );
  }
  return NextResponse.json({ message: data });
}

/** Delete your own message (admins: any message) and its attachment. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await context.params;
  const loaded = await loadMessage(id, messageId);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, isAdmin, message } = loaded;

  if (!isAdmin && message.sender_id !== user.id) {
    return NextResponse.json({ error: "You can only delete your own messages." }, { status: 403 });
  }

  const { error, count } = await supabase
    .from("ticket_messages")
    .delete({ count: "exact" })
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json(
      { error: "Message wasn't deleted. Run migration 004 to allow deleting messages." },
      { status: 409 }
    );
  }

  if (message.attachment_path) {
    await supabase.storage.from(TICKET_BUCKET).remove([message.attachment_path]);
  }
  return NextResponse.json({ deleted: true });
}
