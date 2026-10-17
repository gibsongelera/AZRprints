import { redirect } from "next/navigation";

/** Deep links open the ticket inside the inbox view. */
export default async function AdminTicketThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/tickets?id=${encodeURIComponent(id)}`);
}
