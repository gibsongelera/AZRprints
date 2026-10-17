"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { RowAction, RowActions } from "@/components/ui/RowActions";
import { isActiveJob, PRINT_JOB_LABEL, printJobBadge } from "@/lib/print-jobs";
import type { PrintJob, PrintJobStatus } from "@/lib/types";

type QueueJob = PrintJob & {
  orders?: {
    id: string;
    file_name: string;
    copies: number;
    payment_status: string;
    profiles?: { name?: string } | null;
  } | null;
};

async function fetchJobs(): Promise<{ jobs: QueueJob[]; error: string }> {
  try {
    const res = await fetch("/api/admin/print-jobs", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { jobs: [], error: json.error || `Couldn't load the print queue (error ${res.status}).` };
    return { jobs: (json.jobs as QueueJob[]) || [], error: "" };
  } catch {
    return { jobs: [], error: "Couldn't reach the server. Check your connection and try again." };
  }
}

/** Admin print queue: see every job and retry, cancel or delete it. */
export function PrintQueue() {
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PrintJobStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchJobs().then((res) => {
      if (!active) return;
      setJobs(res.jobs);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setLoading(true);
    const res = await fetchJobs();
    setJobs(res.jobs);
    setError(res.error);
    setLoading(false);
  }

  async function act(job: QueueJob, action: "retry" | "cancel") {
    setBusyId(job.id);
    const res = await fetch(`/api/admin/print-jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error(action === "retry" ? "Couldn't retry the job" : "Couldn't cancel the job", json.error);
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...(json.job as PrintJob) } : j)));
    toast.success(
      action === "retry" ? "Job queued again" : "Job cancelled",
      job.orders?.id || job.order_id
    );
  }

  async function remove(job: QueueJob) {
    const ok = await confirm({
      title: "Delete this print job?",
      message: `The job for ${job.orders?.id || job.order_id} is removed from the queue history. The order itself stays.`,
      confirmLabel: "Delete job",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(job.id);
    const res = await fetch(`/api/admin/print-jobs/${job.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error("Couldn't delete the job", json.error);
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    toast.success("Job deleted");
  }

  const visible = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <section className="rounded-xl border border-pp-border bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pp-border bg-slate-50 px-4 py-3">
        <div>
          <h2 className="font-semibold">Print queue</h2>
          <p className="text-xs text-pp-muted">
            Paid orders waiting for the shop laptop&apos;s print worker, and their history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pq-filter" className="sr-only">Show jobs</label>
          <select
            id="pq-filter"
            className="min-h-9 rounded-lg border border-pp-border bg-white px-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as PrintJobStatus | "all")}
          >
            <option value="all">All jobs ({jobs.length})</option>
            {(Object.keys(PRINT_JOB_LABEL) as PrintJobStatus[]).map((s) => (
              <option key={s} value={s}>
                {PRINT_JOB_LABEL[s]} ({jobs.filter((j) => j.status === s).length})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-pp-border bg-white px-3 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-pp-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Student</th>
              <th className="px-3 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Tries</th>
              <th className="px-3 py-2 font-medium">Queued</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((j) => {
              const busy = busyId === j.id;
              return (
                <tr key={j.id} className="border-t border-pp-border align-top">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{j.orders?.id || j.order_id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{j.orders?.profiles?.name || "—"}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <span className="block truncate" title={j.orders?.file_name}>
                      {j.orders?.file_name || "—"}
                    </span>
                    {j.last_error && (
                      <span className="block text-xs text-red-700" title={j.last_error}>
                        {j.last_error}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${printJobBadge(j.status)}`}>
                      {PRINT_JOB_LABEL[j.status] || j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tnum">{j.attempts}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-pp-muted">
                    {new Date(j.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <RowActions>
                      {!isActiveJob(j.status) && (
                        <RowAction
                          kind="retry"
                          label={j.status === "completed" ? "Print again" : "Retry"}
                          ariaLabel={`${j.status === "completed" ? "Print again" : "Retry"} ${j.orders?.id || j.order_id}`}
                          busy={busy}
                          onClick={() => void act(j, "retry")}
                        />
                      )}
                      {j.status === "queued" && (
                        <RowAction
                          kind="cancel"
                          label="Cancel job"
                          ariaLabel={`Cancel print job for ${j.orders?.id || j.order_id}`}
                          busy={busy}
                          onClick={() => void act(j, "cancel")}
                        />
                      )}
                      {!isActiveJob(j.status) && (
                        <RowAction
                          kind="delete"
                          label="Delete job"
                          ariaLabel={`Delete print job for ${j.orders?.id || j.order_id}`}
                          disabled={busy}
                          onClick={() => void remove(j)}
                        />
                      )}
                      {j.status === "printing" && (
                        <span className="text-xs text-pp-muted">Printing…</span>
                      )}
                    </RowActions>
                  </td>
                </tr>
              );
            })}
            {!loading && !visible.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-pp-muted">
                  {jobs.length
                    ? "No jobs with this status."
                    : "No print jobs yet. Paid orders appear here when auto-print is on, or use Send to printer in Manage Orders."}
                </td>
              </tr>
            )}
            {loading && !jobs.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-pp-muted">Loading print queue…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
