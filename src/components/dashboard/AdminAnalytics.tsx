"use client";

import {
  CircleCheck,
  ClipboardList,
  FileStack,
  Hourglass,
  LifeBuoy,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ExportMenu } from "@/components/ExportMenu";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  ChartJS,
  compactPeso,
  endLabels,
  VIZ,
} from "@/components/dashboard/chart-theme";
import {
  buildBuckets,
  computeKpis,
  countBy,
  inRange,
  JOB_STATUSES,
  ordersByTypeSeries,
  PAYMENT_STATUSES,
  RANGE_LABELS,
  rangeStart,
  rangeSubtitle,
  revenueSeries,
  TICKET_TOPICS,
  topCustomers,
  TYPE_SERIES,
  unitFor,
  type AnalyticsOrder,
  type AnalyticsTicket,
  type RangeKey,
} from "@/lib/analytics";
import type { ExportSpec } from "@/lib/export";
import { formatPHP } from "@/lib/format";

const STATUS_COLOR: Record<string, string> = {
  pending: VIZ.warning,
  in_progress: VIZ.info,
  completed: VIZ.good,
  cancelled: VIZ.muted,
};
const PAYMENT_COLOR: Record<string, string> = {
  paid: VIZ.good,
  pending: VIZ.warning,
  failed: VIZ.critical,
};

function badge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-slate-100 text-slate-700",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

const n = (v: number) => v.toLocaleString("en-PH");

export default function AdminAnalytics({
  orders,
  tickets,
  studentCount,
}: {
  orders: AnalyticsOrder[];
  tickets: AnalyticsTicket[];
  studentCount: number;
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const revenueRef = useRef<ChartJS<"line", number[], string>>(null);
  const paymentsRef = useRef<ChartJS<"doughnut", number[], string>>(null);
  const typesRef = useRef<ChartJS<"bar", number[], string>>(null);
  const jobsRef = useRef<ChartJS<"bar", number[], string>>(null);
  const customersRef = useRef<ChartJS<"bar", number[], string>>(null);
  const topicsRef = useRef<ChartJS<"bar", number[], string>>(null);

  const view = useMemo(() => {
    const now = new Date();
    const start = rangeStart(range, orders, now);
    const unit = unitFor(start, now);
    const buckets = buildBuckets(start, unit, now);
    const rangeOrders = inRange(orders, start);
    const rangeTickets = inRange(tickets, start);
    const kpis = computeKpis(rangeOrders, tickets, rangeTickets, studentCount);
    const statusCounts = countBy(rangeOrders, (o) => o.status);
    const paymentCounts = countBy(rangeOrders, (o) => o.payment_status);
    const topicCounts = countBy(rangeTickets, (t) => t.category);
    return {
      start,
      unit,
      buckets,
      rangeOrders,
      kpis,
      revenue: revenueSeries(rangeOrders, buckets, unit),
      byType: ordersByTypeSeries(rangeOrders, buckets, unit),
      statusCounts,
      paymentCounts,
      topicCounts,
      customers: topCustomers(rangeOrders),
      subtitle: rangeSubtitle(range, start, now),
    };
  }, [range, orders, tickets, studentCount]);

  const { kpis } = view;
  const labels = view.buckets.map((b) => b.label);
  const unitWord = view.unit === "day" ? "day" : view.unit === "week" ? "week" : "month";
  const hasOrders = view.rangeOrders.length > 0;

  const kpiList = [
    { label: "Revenue (paid)", value: formatPHP(kpis.revenue), sub: `${n(kpis.paidCount)} paid orders`, icon: Wallet, tone: "emerald" as const },
    { label: "Orders", value: n(kpis.orderCount), sub: `Average paid order ${formatPHP(kpis.avgOrder)}`, icon: ClipboardList, tone: "blue" as const },
    { label: "Pages printed", value: n(kpis.pagesPrinted), sub: "Paid pages × copies", icon: FileStack, tone: "violet" as const },
    { label: "Jobs in queue", value: n(kpis.pending + kpis.inProgress), sub: `${n(kpis.pending)} pending, ${n(kpis.inProgress)} printing`, icon: Hourglass, tone: "orange" as const },
    { label: "Unpaid orders", value: n(kpis.unpaidCount), sub: `${formatPHP(kpis.unpaidAmount)} not yet collected`, icon: WalletCards, tone: "rose" as const },
    { label: "Completed", value: n(kpis.completed), sub: `${kpis.completionRate}% of active orders`, icon: CircleCheck, tone: "teal" as const },
    { label: "Open tickets", value: n(kpis.openTickets), sub: `${n(kpis.newTickets)} new in this period`, icon: LifeBuoy, tone: "cyan" as const },
    { label: "Students", value: n(kpis.students), sub: `${n(kpis.activeStudents)} ordered in this period`, icon: Users, tone: "indigo" as const },
  ];

  const jobRows = JOB_STATUSES.map((s) => ({ ...s, value: view.statusCounts[s.key] || 0 }));
  const payRows = PAYMENT_STATUSES.map((s) => ({ ...s, value: view.paymentCounts[s.key] || 0 }));
  const topicRows = Object.entries(TICKET_TOPICS)
    .map(([key, label]) => ({ key, label, value: view.topicCounts[key] || 0 }))
    .sort((a, b) => b.value - a.value);
  const paySum = payRows.reduce((s, r) => s + r.value, 0);

  const exportSpec = (): ExportSpec<AnalyticsOrder> => {
    const img = (c: { toBase64Image: (t?: string, q?: number) => string } | null) => {
      try {
        return c ? c.toBase64Image("image/png", 1) : "";
      } catch {
        return "";
      }
    };
    const chartImages = [
      { title: "Revenue", image: img(revenueRef.current) },
      { title: "Payment status", image: img(paymentsRef.current) },
      { title: "Orders by print type", image: img(typesRef.current) },
      { title: "Job status", image: img(jobsRef.current) },
      { title: "Top customers", image: img(customersRef.current) },
      { title: "Tickets by topic", image: img(topicsRef.current) },
    ].filter((c) => c.image);

    return {
      filename: `azr-dashboard-${range}`,
      title: "Dashboard report",
      subtitle: view.subtitle,
      sheetName: "Orders",
      summary: kpiList.map((k) => ({ label: k.label, value: k.value })),
      charts: chartImages,
      rows: view.rangeOrders,
      columns: [
        { header: "Order", value: (o) => o.id, width: 20 },
        { header: "Date", value: (o) => o.created_at, type: "datetime", width: 18 },
        { header: "Customer", value: (o) => o.customer, width: 22 },
        { header: "Student ID", value: (o) => o.student_id, width: 16 },
        { header: "File", value: (o) => o.file_name, width: 30 },
        { header: "Type", value: (o) => (o.type === "photo" ? "Photo" : o.color === "color" ? "Document, color" : "Document, B&W"), width: 16 },
        { header: "Pages", value: (o) => o.pages, type: "number", width: 8 },
        { header: "Copies", value: (o) => o.copies, type: "number", width: 8 },
        { header: "Amount", value: (o) => o.amount, type: "currency", width: 12 },
        { header: "Payment", value: (o) => (o.payment_status === "pending" ? "unpaid" : o.payment_status), width: 10 },
        { header: "Job status", value: (o) => o.status.replace("_", " "), width: 12 },
      ],
    };
  };

  const recent = view.rangeOrders.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* One filter row scopes every card and chart below */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Date range" className="inline-flex flex-wrap rounded-xl border border-pp-border bg-white p-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                range === r ? "bg-pp-primary text-white" : "text-pp-muted hover:bg-slate-50"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <ExportMenu getSpec={exportSpec} label="Export report" />
      </div>
      <p className="-mt-2 text-xs text-pp-muted">{view.subtitle}</p>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {kpiList.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue"
          figure={formatPHP(kpis.revenue)}
          note={`Paid orders per ${unitWord}`}
          empty={!kpis.paidCount && "No paid orders in this period yet."}
          table={{
            headers: [view.unit === "month" ? "Month" : view.unit === "week" ? "Week of" : "Day", "Revenue"],
            rows: view.buckets.map((b, i) => [b.label, formatPHP(view.revenue[i])]),
          }}
        >
          <Line
            ref={revenueRef}
            data={{
              labels,
              datasets: [
                {
                  label: "Revenue",
                  data: view.revenue,
                  borderColor: VIZ.series[0],
                  backgroundColor: "rgba(42, 120, 214, 0.10)",
                  fill: true,
                  borderWidth: 2,
                  tension: 0.25,
                  pointRadius: labels.length > 40 ? 0 : 3,
                  pointHoverRadius: 5,
                  pointBackgroundColor: VIZ.series[0],
                  pointBorderColor: VIZ.surface,
                  pointBorderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${formatPHP(c.parsed.y ?? 0)}` } },
              },
              scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
                y: {
                  beginAtZero: true,
                  border: { display: false },
                  ticks: { maxTicksLimit: 5, callback: (v) => compactPeso(Number(v)) },
                },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          title="Payment status"
          figure={`${n(paySum)} orders`}
          empty={!paySum && "No orders in this period."}
          table={{
            headers: ["Payment", "Orders", "Share"],
            rows: payRows.map((r) => [
              r.label,
              r.value,
              paySum ? `${Math.round((r.value / paySum) * 100)}%` : "0%",
            ]),
          }}
        >
          <Doughnut
            ref={paymentsRef}
            data={{
              labels: payRows.map((r) => `${r.label} (${n(r.value)})`),
              datasets: [
                {
                  data: payRows.map((r) => r.value),
                  backgroundColor: payRows.map((r) => PAYMENT_COLOR[r.key]),
                  borderColor: VIZ.surface,
                  borderWidth: 2,
                  hoverOffset: 4,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "66%",
              plugins: {
                legend: { position: "bottom" },
                tooltip: {
                  callbacks: {
                    label: (c) =>
                      ` ${n(Number(c.raw))} orders (${paySum ? Math.round((Number(c.raw) / paySum) * 100) : 0}%)`,
                  },
                },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Orders by print type"
          figure={`${n(kpis.orderCount)} orders`}
          note={`Orders placed per ${unitWord}`}
          empty={!hasOrders && "No orders in this period yet."}
          table={{
            headers: ["Period", ...TYPE_SERIES.map((s) => s.label)],
            rows: view.buckets.map((b, i) => [b.label, ...TYPE_SERIES.map((s) => view.byType[s.key][i])]),
          }}
        >
          <Bar
            ref={typesRef}
            data={{
              labels,
              datasets: TYPE_SERIES.map((s, i) => ({
                label: s.label,
                data: view.byType[s.key],
                backgroundColor: VIZ.series[i],
                borderColor: VIZ.surface,
                borderWidth: { top: 2 },
                borderSkipped: false,
                borderRadius: 3,
                maxBarThickness: 28,
                stack: "types",
              })),
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "top", align: "end" } },
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 10, maxRotation: 0 } },
                y: { stacked: true, beginAtZero: true, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          title="Job status"
          empty={!hasOrders && "No print jobs in this period."}
          table={{ headers: ["Status", "Orders"], rows: jobRows.map((r) => [r.label, r.value]) }}
        >
          <Bar
            ref={jobsRef}
            plugins={[endLabels((v) => n(v))]}
            data={{
              labels: jobRows.map((r) => r.label),
              datasets: [
                {
                  label: "Orders",
                  data: jobRows.map((r) => r.value),
                  backgroundColor: jobRows.map((r) => STATUS_COLOR[r.key]),
                  borderRadius: 4,
                  borderSkipped: "start",
                  barThickness: 20,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { right: 36 } },
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } },
                y: { grid: { display: false } },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Top customers by spend"
          note="Paid orders in this period"
          empty={!view.customers.length && "No paid orders in this period yet."}
          table={{
            headers: ["Customer", "Orders", "Spent"],
            rows: view.customers.map((c) => [c.name, c.orders, formatPHP(c.total)]),
          }}
        >
          <Bar
            ref={customersRef}
            plugins={[endLabels((v) => formatPHP(v))]}
            data={{
              labels: view.customers.map((c) => c.name),
              datasets: [
                {
                  label: "Spent",
                  data: view.customers.map((c) => Math.round(c.total * 100) / 100),
                  backgroundColor: VIZ.series[0],
                  borderRadius: 4,
                  borderSkipped: "start",
                  barThickness: 20,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { right: 72 } },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${formatPHP(Number(c.raw))}` } },
              },
              scales: {
                x: { beginAtZero: true, border: { display: false }, ticks: { maxTicksLimit: 5, callback: (v) => compactPeso(Number(v)) } },
                y: { grid: { display: false } },
              },
            }}
          />
        </ChartCard>

        <ChartCard
          title="Tickets by topic"
          figure={`${n(kpis.newTickets)} new`}
          empty={!kpis.newTickets && "No support tickets in this period."}
          table={{ headers: ["Topic", "Tickets"], rows: topicRows.map((r) => [r.label, r.value]) }}
        >
          <Bar
            ref={topicsRef}
            plugins={[endLabels((v) => n(v))]}
            data={{
              labels: topicRows.map((r) => r.label),
              datasets: [
                {
                  label: "Tickets",
                  data: topicRows.map((r) => r.value),
                  backgroundColor: VIZ.series[0],
                  borderRadius: 4,
                  borderSkipped: "start",
                  barThickness: 18,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { right: 32 } },
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 4 } },
                y: { grid: { display: false } },
              },
            }}
          />
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-pp-border bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-pp-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-pp-accent hover:underline">
            Manage orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t border-pp-border">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{o.id}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{o.customer || "—"}</td>
                  <td className="px-4 py-2 max-w-[240px] truncate" title={o.file_name}>{o.file_name}</td>
                  <td className="px-4 py-2 text-right tnum">{formatPHP(o.amount)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(o.status)}`}>{o.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(o.payment_status)}`}>{o.payment_status === "pending" ? "unpaid" : o.payment_status}</span>
                  </td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-pp-muted">
                    No orders in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
