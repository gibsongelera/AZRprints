import { AdminAnalyticsLoader } from "@/components/dashboard/AdminAnalyticsLoader";
import type { AnalyticsOrder, AnalyticsTicket } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderRow = Omit<AnalyticsOrder, "customer" | "student_id"> & {
  profiles: { name: string | null; student_id: string | null } | null;
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Supabase returns at most 1,000 rows per request, so page through results.
  async function fetchAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  ): Promise<{ rows: T[]; error?: string }> {
    const size = 1000;
    const rows: T[] = [];
    for (let page = 0; page < 50; page++) {
      const { data, error } = await build(page * size, page * size + size - 1);
      if (error) return { rows, error: error.message };
      const batch = (data as T[]) || [];
      rows.push(...batch);
      if (batch.length < size) break;
    }
    return { rows };
  }

  const [ordersRes, ticketsRes, studentsRes] = await Promise.all([
    fetchAll<OrderRow>((from, to) =>
      supabase
        .from("orders")
        .select(
          "id, user_id, amount, status, payment_status, type, color, pages, copies, file_name, created_at, profiles(name, student_id)"
        )
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll<AnalyticsTicket>((from, to) =>
      supabase
        .from("tickets")
        .select("id, status, category, created_at")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user"),
  ]);

  const orders: AnalyticsOrder[] = ordersRes.rows.map(
    ({ profiles, ...o }) => ({
      ...o,
      amount: Number(o.amount) || 0,
      customer: profiles?.name || "",
      student_id: profiles?.student_id ?? null,
    })
  );
  const tickets = ticketsRes.rows;
  const loadError = ordersRes.error || ticketsRes.error;

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Some dashboard data couldn&apos;t load: {loadError}
        </div>
      )}
      <AdminAnalyticsLoader
        orders={orders}
        tickets={tickets}
        studentCount={studentsRes.count ?? 0}
      />
    </div>
  );
}
