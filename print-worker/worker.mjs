import "dotenv/config";
import { execSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createClient } from "@supabase/supabase-js";
import ptp from "pdf-to-printer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerId =
  process.env.PRINT_WORKER_ID ||
  `${os.hostname()}-${process.pid}`.replace(/[^\w.-]/g, "_");

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in print-worker/.env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SPOOL_DIR =
  process.env.PRINT_SPOOL_DIR || path.join(os.tmpdir(), "azr-prints-spool");

async function loadSettings() {
  const { data } = await supabase
    .from("printer_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (
    data || {
      poll_interval_seconds: 15,
      max_job_retries: 3,
      default_printer_name: "",
      spool_retention_hours: 24,
      direct_print_enabled: true,
    }
  );
}

async function purgeOldSpool(retentionHours) {
  try {
    const entries = await readdir(SPOOL_DIR);
    const cutoff = Date.now() - retentionHours * 3600 * 1000;
    for (const name of entries) {
      const full = path.join(SPOOL_DIR, name);
      const st = await stat(full);
      if (st.mtimeMs < cutoff) await rm(full, { force: true });
    }
  } catch {
    /* spool may not exist yet */
  }
}

async function downloadOrderFile(filePath, destPath) {
  const { data, error } = await supabase.storage
    .from("order-files")
    .download(filePath);
  if (error || !data) throw new Error(error?.message || "download failed");
  await pipeline(data.stream(), createWriteStream(destPath));
}

async function printFile(localPath, printerName, copies) {
  const ext = path.extname(localPath).toLowerCase();
  const opts = printerName ? { printer: printerName } : {};

  if (ext === ".pdf") {
    const count = Math.max(1, copies);
    for (let i = 0; i < count; i++) {
      await ptp.print(localPath, opts);
    }
    return;
  }

  if (process.platform === "win32") {
    const printerArg = printerName
      ? `-printto "${printerName.replace(/"/g, '`"')}"`
      : "";
    for (let i = 0; i < Math.max(1, copies); i++) {
      execSync(
        `powershell -NoProfile -Command "Start-Process -FilePath '${localPath.replace(/'/g, "''")}' -Verb Print ${printerArg}"`,
        { stdio: "ignore" }
      );
    }
    return;
  }

  for (let i = 0; i < Math.max(1, copies); i++) {
    execSync(`lp ${printerName ? `-d ${JSON.stringify(printerName)} ` : ""}${JSON.stringify(localPath)}`, {
      stdio: "ignore",
    });
  }
}

async function completeJob(jobId) {
  await supabase
    .from("print_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", jobId);
}

async function failJob(jobId, message, maxRetries, attempts) {
  const final = attempts >= maxRetries;
  await supabase
    .from("print_jobs")
    .update({
      status: final ? "failed" : "queued",
      last_error: message.slice(0, 500),
      locked_by: null,
      locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function processOneJob(settings) {
  const printerName =
    process.env.PRINT_WORKER_PRINTER || settings.default_printer_name || "";

  const { data: jobs, error } = await supabase.rpc("claim_next_print_job", {
    p_worker_id: workerId,
    p_printer_name: printerName,
  });

  if (error) {
    console.error("claim_next_print_job:", error.message);
    return;
  }
  const job = Array.isArray(jobs) ? jobs[0] : jobs;
  if (!job) return;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, file_path, file_name, copies")
    .eq("id", job.order_id)
    .single();

  if (orderErr || !order?.file_path) {
    await failJob(
      job.id,
      orderErr?.message || "missing file_path",
      settings.max_job_retries,
      job.attempts
    );
    return;
  }

  await mkdir(SPOOL_DIR, { recursive: true });
  const safeName = (order.file_name || "order").replace(/[^\w.\-]+/g, "_");
  const localPath = path.join(SPOOL_DIR, `${job.id}-${safeName}`);

  try {
    await downloadOrderFile(order.file_path, localPath);
    await printFile(localPath, printerName, job.copies || order.copies || 1);
    await completeJob(job.id);
    console.log(`[ok] ${order.id} → printer ${printerName || "(default)"}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[fail] ${order.id}:`, msg);
    await failJob(job.id, msg, settings.max_job_retries, job.attempts);
  }
}

async function loop() {
  console.log(`AZR PRINT worker ${workerId} — spool ${SPOOL_DIR}`);
  for (;;) {
    const settings = await loadSettings();
    if (!settings.direct_print_enabled) {
      await sleep((settings.poll_interval_seconds || 15) * 1000);
      continue;
    }
    await purgeOldSpool(settings.spool_retention_hours || 24);
    await processOneJob(settings);
    await sleep((settings.poll_interval_seconds || 15) * 1000);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
