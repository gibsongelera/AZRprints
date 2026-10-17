import type { ExportColumn } from "./export";
import type { Order } from "./types";

export type OrderWithProfile = Order & {
  profiles?: { name?: string | null; student_id?: string | null } | null;
};

export function printTypeLabel(o: Pick<Order, "type" | "color">) {
  if (o.type === "photo") return "Photo";
  return o.color === "color" ? "Document, color" : "Document, B&W";
}

export const ORDER_EXPORT_COLUMNS: ExportColumn<OrderWithProfile>[] = [
  { header: "Order", value: (o) => o.id, width: 20 },
  { header: "Date", value: (o) => o.created_at, type: "datetime", width: 18 },
  { header: "Customer", value: (o) => o.profiles?.name || "", width: 22 },
  { header: "Student ID", value: (o) => o.profiles?.student_id || "", width: 16 },
  { header: "File", value: (o) => (o.file_path ? o.file_name : "(no file)"), width: 32 },
  { header: "Type", value: (o) => printTypeLabel(o), width: 16 },
  { header: "Pages", value: (o) => o.pages, type: "number", width: 8 },
  { header: "Copies", value: (o) => o.copies, type: "number", width: 8 },
  { header: "Amount", value: (o) => o.amount, type: "currency", width: 12 },
  { header: "Payment", value: (o) => (o.payment_status === "pending" ? "unpaid" : o.payment_status), width: 10 },
  { header: "Job status", value: (o) => o.status.replace("_", " "), width: 12 },
];

export function matchesSearch(o: OrderWithProfile, q: string) {
  if (!q) return true;
  const hay = `${o.id} ${o.file_name} ${o.profiles?.name || ""} ${o.profiles?.student_id || ""}`.toLowerCase();
  return hay.includes(q.toLowerCase().trim());
}
