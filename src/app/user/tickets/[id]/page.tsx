import { redirect } from "next/navigation";
import { TicketThread } from "@/components/TicketThread";
import { createClient } from "@/lib/supabase/server";

export default async function UserTicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!ticket || ticket.user_id !== user.id) {
    redirect("/user/tickets");
  }

  return <TicketThread ticketId={id} viewerRole="user" />;
}
