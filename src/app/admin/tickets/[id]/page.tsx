import { TicketThread } from "@/components/TicketThread";

export default async function AdminTicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketThread ticketId={id} viewerRole="admin" />;
}
