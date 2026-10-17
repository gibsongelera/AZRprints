/*
 * Pure helpers for the admin dashboard: date ranges, time buckets and
 * aggregations. No React, no Supabase — easy to test.
 */

export type RangeKey = "7d" | "30d" | "90d" | "12m" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

export type AnalyticsOrder = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_status: string;
  type: string;
  color: string;
  pages: number;
  copies: number;
  file_name: string;
  created_at: string;
  customer: string;
  student_id: string | null;
};

export type AnalyticsTicket = {
  id: string;
  status: string;
  category: string;
  created_at: string;
};

export type Unit = "day" | "week" | "month";
export type Bucket = { key: string; label: string; start: Date };

const DAY = 86400000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function rangeStart(range: RangeKey, orders: AnalyticsOrder[], now = new Date()): Date {
  const today = startOfDay(now);
  switch (range) {
    case "7d":
      return new Date(today.getTime() - 6 * DAY);
    case "30d":
      return new Date(today.getTime() - 29 * DAY);
    case "90d":
      return new Date(today.getTime() - 89 * DAY);
    case "12m": {
      const x = startOfMonth(today);
      x.setMonth(x.getMonth() - 11);
      return x;
    }
    case "all": {
      const earliest = orders.reduce<number>(
        (min, o) => Math.min(min, new Date(o.created_at).getTime()),
        today.getTime()
      );
      return startOfDay(new Date(earliest));
    }
  }
}

export function unitFor(start: Date, now = new Date()): Unit {
  const days = (now.getTime() - start.getTime()) / DAY;
  if (days <= 45) return "day";
  if (days <= 120) return "week";
  return "month";
}

function keyOf(d: Date, unit: Unit) {
  const s = unit === "day" ? startOfDay(d) : unit === "week" ? startOfWeek(d) : startOfMonth(d);
  return `${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()}`;
}

export function buildBuckets(start: Date, unit: Unit, now = new Date()): Bucket[] {
  const buckets: Bucket[] = [];
  let cur =
    unit === "day" ? startOfDay(start) : unit === "week" ? startOfWeek(start) : startOfMonth(start);
  const end = now.getTime();
  const fmtDay = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
  const fmtMonth = new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit" });
  while (cur.getTime() <= end && buckets.length < 400) {
    buckets.push({
      key: keyOf(cur, unit),
      label: unit === "month" ? fmtMonth.format(cur) : fmtDay.format(cur),
      start: new Date(cur),
    });
    const next = new Date(cur);
    if (unit === "day") next.setDate(next.getDate() + 1);
    else if (unit === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    cur = next;
  }
  return buckets;
}

export function inRange<T extends { created_at: string }>(rows: T[], start: Date) {
  const t = start.getTime();
  return rows.filter((r) => new Date(r.created_at).getTime() >= t);
}

const isPaid = (o: AnalyticsOrder) => o.payment_status === "paid";

export function computeKpis(
  orders: AnalyticsOrder[],
  allTickets: AnalyticsTicket[],
  rangeTickets: AnalyticsTicket[],
  studentCount: number
) {
  const paid = orders.filter(isPaid);
  const revenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
  const unpaid = orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled");
  const completed = orders.filter((o) => o.status === "completed").length;
  const active = orders.filter((o) => o.status !== "cancelled").length;
  return {
    revenue,
    paidCount: paid.length,
    orderCount: orders.length,
    avgOrder: paid.length ? revenue / paid.length : 0,
    pagesPrinted: paid.reduce((s, o) => s + Number(o.pages || 0) * Number(o.copies || 1), 0),
    pending: orders.filter((o) => o.status === "pending").length,
    inProgress: orders.filter((o) => o.status === "in_progress").length,
    unpaidCount: unpaid.length,
    unpaidAmount: unpaid.reduce((s, o) => s + Number(o.amount || 0), 0),
    completed,
    completionRate: active ? Math.round((completed / active) * 100) : 0,
    openTickets: allTickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
    newTickets: rangeTickets.length,
    students: studentCount,
    activeStudents: new Set(orders.map((o) => o.user_id)).size,
  };
}

export function revenueSeries(orders: AnalyticsOrder[], buckets: Bucket[], unit: Unit) {
  const map = new Map(buckets.map((b) => [b.key, 0]));
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const k = keyOf(new Date(o.created_at), unit);
    if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(o.amount || 0));
  }
  return buckets.map((b) => Math.round((map.get(b.key) || 0) * 100) / 100);
}

export const TYPE_SERIES = [
  { key: "document_bw", label: "Document, B&W" },
  { key: "document_color", label: "Document, color" },
  { key: "photo", label: "Photo" },
] as const;

function typeKey(o: AnalyticsOrder) {
  if (o.type === "photo") return "photo";
  return o.color === "color" ? "document_color" : "document_bw";
}

export function ordersByTypeSeries(orders: AnalyticsOrder[], buckets: Bucket[], unit: Unit) {
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const series: Record<string, number[]> = Object.fromEntries(
    TYPE_SERIES.map((s) => [s.key, buckets.map(() => 0)])
  );
  for (const o of orders) {
    const i = index.get(keyOf(new Date(o.created_at), unit));
    if (i === undefined) continue;
    series[typeKey(o)][i] += 1;
  }
  return series;
}

export const JOB_STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export const PAYMENT_STATUSES = [
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Unpaid" },
  { key: "failed", label: "Failed" },
] as const;

export function countBy<T>(rows: T[], keyFn: (r: T) => string) {
  const m: Record<string, number> = {};
  for (const r of rows) {
    const k = keyFn(r);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

export function topCustomers(orders: AnalyticsOrder[], n = 5) {
  const m = new Map<string, { name: string; total: number; orders: number }>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const cur = m.get(o.user_id) || { name: o.customer || "Unknown", total: 0, orders: 0 };
    cur.total += Number(o.amount || 0);
    cur.orders += 1;
    m.set(o.user_id, cur);
  }
  return [...m.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

export const TICKET_TOPICS: Record<string, string> = {
  order_issue: "Order issue",
  payment: "Payment",
  printer: "Printer",
  report: "Report",
  general: "General",
};

export function rangeSubtitle(range: RangeKey, start: Date, now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
  return `${RANGE_LABELS[range]} (${fmt.format(start)} to ${fmt.format(now)})`;
}
