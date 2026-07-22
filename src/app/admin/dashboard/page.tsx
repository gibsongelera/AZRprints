import { createClient } from "@/lib/supabase/server";
import { formatPHP } from "@/lib/format";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ data: orders }, { count: userCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, amount, status, payment_status, file_name, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user"),
  ]);

  const allForStats = await supabase
    .from("orders")
    .select("amount, status, payment_status");

  const list = allForStats.data || [];
  const sales = list
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const pendingOrders = list.filter((o) => o.status === "pending").length;
  const pendingPay = list.filter((o) => o.payment_status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total sales (paid)", value: formatPHP(sales) },
          { label: "Orders", value: String(list.length) },
          { label: "Students", value: String(userCount ?? 0) },
          { label: "Pending / unpaid", value: `${pendingOrders} / ${pendingPay}` },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-pp-border bg-white p-4"
          >
            <div className="text-xs text-pp-muted">{c.label}</div>
            <div className="text-xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-pp-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-pp-border font-semibold">
          Recent orders
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((o) => (
                <tr key={o.id} className="border-t border-pp-border">
                  <td className="px-4 py-2 font-medium">{o.id}</td>
                  <td className="px-4 py-2">{o.file_name}</td>
                  <td className="px-4 py-2">{formatPHP(o.amount)}</td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2">{o.payment_status}</td>
                </tr>
              ))}
              {!orders?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-pp-muted">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
