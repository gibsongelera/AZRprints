# Printer setup (local worker)

Run the **print worker** on the laptop or PC connected to the shop printer. The web app (Vercel) cannot print directly; after PayMongo confirms payment, a row is added to `print_jobs` and this worker pulls it safely.

## Prerequisites

- Windows 10/11 or macOS/Linux with CUPS
- Printer installed and tested from the OS (print a test page manually first)
- Supabase migration `002_print_queue.sql` applied
- `SUPABASE_SERVICE_ROLE_KEY` stored **only** on the shop PC (never in the browser or Vercel)

## Step 1 — Apply database migration

In Supabase SQL Editor, run:

1. `supabase/migrations/001_initial.sql` (if not already)
2. `supabase/migrations/002_print_queue.sql`

## Step 2 — Enable auto-print in admin

1. Log in as admin → **Printer**
2. Enable **Auto-queue print jobs when payment is confirmed**
3. Enable **Allow direct printer integration**
4. Set **Default printer name** to match Windows (see step 3)
5. Save

## Step 3 — Find your printer name

```bash
cd print-worker
npm install
npm run list-printers
```

Copy the exact **Name** column into Admin → Printer → Default printer name, or set `PRINT_WORKER_PRINTER` in `print-worker/.env`.

## Step 4 — Configure worker env

```bash
cd print-worker
cp .env.example .env
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (same project as production).

## Step 5 — Run the worker

```bash
npm start
```

Keep this terminal open during shop hours. The worker:

- Polls every N seconds (admin **Worker poll** setting)
- Claims one job at a time via `claim_next_print_job` (no double-print)
- Downloads the file to a local spool folder
- Prints PDFs via `pdf-to-printer` (Windows); images via OS print verb
- Marks jobs `completed` or re-queues until **Max retries**

## Step 6 — Test end-to-end

1. Place a small PDF order as a student user
2. Pay with PayMongo test mode
3. Confirm order shows **in progress** and a `print_jobs` row is `queued`
4. Worker log should show `[ok] ORD-…`

## Run at startup (Windows)

Use **Task Scheduler** → trigger At log on → action `node` with argument `C:\path\to\print-worker\worker.mjs`, start in `print-worker` folder, or use `nssm` to run as a service.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| No jobs queued | Admin → Printer toggles; payment `paid`; migration 002 |
| `claim_next_print_job` permission | Function granted to `service_role` only |
| Wrong printer | `PRINT_WORKER_PRINTER` or admin default name |
| PDF prints blank | Reinstall printer driver; test with `pdf-to-printer` manually |
| Double prints | Only one worker instance per shop |

## Limitations

- **DOC/DOCX** are spooled as-is; Windows may open an app to print. Prefer PDF uploads for reliable unattended printing.
- Mixed PDF detection is heuristic (image operators per page), not a full layout analysis.
- Worker requires outbound HTTPS to Supabase; no inbound ports on the shop PC.
