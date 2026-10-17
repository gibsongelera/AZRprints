import type { PrintJobStatus } from "./types";

export const PRINT_JOB_LABEL: Record<PrintJobStatus, string> = {
  queued: "Waiting",
  printing: "Printing",
  completed: "Printed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function printJobBadge(status: string) {
  const map: Record<string, string> = {
    queued: "bg-amber-100 text-amber-800",
    printing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-slate-100 text-slate-700",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export function isActiveJob(status: string) {
  return status === "queued" || status === "printing";
}
