# Agent prompt: AZR PRINT'S client revisions (October 2026)

> **How to use:** open your AI coding agent (Cursor, Claude Code, Copilot, etc.) at the project root
> `C:\xampp\htdocs\capstoneshan`, then paste everything below the line. Make sure the agent can see the
> `docs/agent-prompt/images/` folder (attach the images, or let the agent open them from disk).
> The full plan with every picture embedded is in `docs/agent-prompt/PLAN.md`.

---

## Role

You are a senior full-stack engineer working on **AZR PRINT'S**, a campus printing portal for
Zamboanga Peninsula Polytechnic State University (ZPPSU). Implement the client's revision list below,
frontend **and** backend, with correct logic, security and UX. Work carefully and verify everything.

## Project context

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
  Supabase (Auth, Postgres + RLS, Storage, Realtime) · PayMongo (Checkout Sessions) · Vercel ·
  a local Node print worker (`print-worker/`).
- **Roles:** `user` (student) and `admin`. Route groups: `src/app/user/*`, `src/app/admin/*`,
  API in `src/app/api/*`. Shared shell: `src/components/AppShell.tsx`.
- **Order flow:** student uploads a file on `/user/dashboard` → `POST /api/orders` → `POST /api/orders/checkout`
  (PayMongo hosted checkout) → return to `/user/orders?paid=1` → `POST /api/orders/confirm-payment`
  (and/or `POST /api/paymongo/webhook`) → `payment_status = paid`, `status = in_progress` → print job queued.
- **Support:** tickets + live chat (`tickets`, `ticket_messages`, Supabase Realtime) in `TicketThread.tsx`.
- **Migrations:** `supabase/migrations/001_initial.sql`, `002_print_queue.sql`, `003_tickets.sql`.
- **Brand:** navy sidebar `#020617`/`#0f172a`, red accent `#dc2626`, slate background `#f1f5f9`,
  fonts Inter (body) + Hanken Grotesk (headings). Keep this look.
- Developer environment: Windows, VS Code, XAMPP folder. Deployed at `azrprinting.vercel.app`.

## Inputs to study first (look at every image)

Client source material (from the client's walkthrough videos):

| Image | What it shows |
|---|---|
| `docs/agent-prompt/images/client/notebook-user-side-1.jpg` | Client's handwritten notes, "SHEI – SYSTEM / USER SIDE" (top half) |
| `docs/agent-prompt/images/client/notebook-user-side-2.jpg` | Same page, lower lines visible |
| `docs/agent-prompt/images/client/notebook-user-side-3.jpg` | Same page, last line: "…what if I will print a ton of documents with photos?" |
| `docs/agent-prompt/images/client/video1-student-*.jpg` | Student pages **before** the update (New Order, My Orders, Support, Profile) |
| `docs/agent-prompt/images/client/video2-admin-*.jpg` | Admin pages **before** the update (Tickets, Pricing, Order Files, Manage Orders, Dashboard, Users) |
| `docs/agent-prompt/images/client/video2-admin-printer-stuck-loading.jpg` | **Bug:** Printer page stuck on "Loading printer settings… (run migration 002 if this hangs)" |

Transcribed client notes (USER SIDE):

1. *PDF required for uploading* — show a warning when submitting a different format, because it could
   mess up the template of the documents, so PDF is highly suggested.
2. *When logging out* there must be a confirmation modal like "Yes" and "No" before fully logging out.
3. *The log-out button must be placed at the very bottom of the sidebar.* Rearrange the button/tab list.
4. *Document and Photo are the two options to choose, but what exactly?* Let's say, what if I will print
   a ton of documents with photos?

Target result (reference screenshots of a working implementation): `docs/agent-prompt/images/after/*.jpg`
and sample exports `export-sample-dashboard-report.pdf` / `.xlsx`.

## Ground rules

1. **Audit first.** Some or all of this may already be implemented in the repo (see the file map at
   the end). For each requirement check whether it exists and works; only build what is missing or
   broken. Never create a duplicate of an existing component.
2. Keep the existing visual identity and Tailwind tokens (`pp-*` in `src/app/globals.css`).
3. **No `alert()` / `window.confirm()` anywhere.** Use the toast system and the styled confirm dialog.
4. All database changes go in **one idempotent migration**:
   `supabase/migrations/004_notifications_avatars_attachments.sql` (safe to run twice).
5. Enforce permissions with **RLS + server checks**. Never trust the client for ownership.
6. Vercel limits request bodies to about 4.5 MB, so large files go **browser → Supabase Storage directly**,
   then the API verifies them.
7. Only these new dependencies (exact versions): `chart.js@4.5.1`, `react-chartjs-2@5.3.1`,
   `jspdf@4.2.1`, `jspdf-autotable@5.0.8`, `write-excel-file@4.1.1`, `lucide-react@1.49.0`.
   Load export libraries with dynamic `import()` on click.
8. User-facing copy: plain, sentence case, active verbs ("Save changes", "Log out"); errors say what
   happened and how to fix it.
9. Accessibility: labels on inputs, visible keyboard focus, `aria-*` on menus/dialogs, WCAG AA contrast,
   works at 390 px width.

## Requirements and acceptance criteria

### R1. Profile dropdown on the avatar (every page, student and admin)
- Header right side: avatar (photo or initials) + name + chevron → dropdown.
- Dropdown shows avatar, name, email, role badge (Student / Administrator); links: My profile,
  (admin) Shop settings, Notifications, Support/Tickets; **Log out** at the bottom.
- Closes on outside click and Escape. See `after/admin-06-profile-dropdown.jpg`.

### R2. Notification bell (every page)
- Bell with unread badge (`9+` cap), dropdown list (icon by type, title, message, time ago, unread dot),
  "Mark all as read", "View all notifications" → `/user/notifications` or `/admin/notifications`.
- Live updates via Supabase Realtime on `notifications` INSERT; each new one also shows a **toast**.
- Clicking an item marks it read and opens its `link`.
- Notifications are created **automatically by DB triggers** (single source of truth):
  - new order → admins; payment paid → student ("Payment received") + admins; payment failed → student;
    job status change → student ("Order ready for pickup", "Order cancelled", …);
    new ticket → admins; admin reply → student; student follow-up reply → admins.
  - Remove any app-level duplicate inserts (in `confirm-payment` and the PayMongo webhook).
- Visibility (RLS): personal (`user_id = me`) + broadcasts by `audience`: `all`, `users` (students), `admin`.
  Students never see admin broadcasts or other users' personal notifications.
- Admin Notifications page: tabs **My inbox** and **Announcements** (post with audience
  Everyone / Students only / Admins only, style Info / Good news / Warning; delete with confirmation).
- See `after/admin-05-notification-bell.jpg`, `after/student-07-notifications-page.jpg`,
  `after/admin-11-announcements.jpg`, `after/student-11-bell-mobile.jpg`.

### R3. Ticket file attachments (upload + download for both sides)
- Paperclip "Attach a file" on the **New ticket** form and in the chat composer (student and admin).
- Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, jpg, jpeg, png, webp, gif; max 10 MB.
- Upload path: `ticket-files/<ticket owner id>/<ticket id>/<timestamp>-<safe name>` (private bucket).
  For a new ticket the browser pre-generates the ticket UUID (with a fallback when
  `crypto.randomUUID` is unavailable on plain-http LAN addresses).
- API verifies the path belongs to that ticket's folder, has no `..`, and the object exists, then saves
  `attachment_path/name/type/size` on `ticket_messages`. A message may be file-only (empty text).
- Every attachment in the thread shows file icon, name, type and size, plus **View** (pdf/images/txt) and
  **Download** buttons for both the student and the admin. They go through
  `GET /api/tickets/[id]/attachments/[messageId]`, which returns a signed URL after an owner/admin check.
- See `after/student-04-support-new-ticket-attach.jpg`, `after/student-05-ticket-thread-attachments.jpg`,
  `after/admin-08-tickets-with-attachments.jpg`.

### R4. Change profile picture
- On student and admin Profile: avatar preview, **Upload / Change picture**, **Remove** (confirm).
- Client crops to a square and resizes to 512 px WebP (GIF kept as-is); server accepts jpg/png/webp/gif ≤ 2 MB.
- Public `avatars` bucket, path `<uid>/avatar-<timestamp>.<ext>`; save URL in `profiles.avatar_url`;
  delete older files; `router.refresh()` so the header avatar updates.
- See `after/student-06-profile-picture.jpg`.

### R5. Payment: hide/remove the "Gibson Gelera" name
- That name is the PayMongo **account** name shown on PayMongo's hosted checkout; it is not in the code.
- Send `statement_descriptor` = env `PAYMONGO_STATEMENT_DESCRIPTOR` (default `AZR PRINTS`, sanitized to
  letters/numbers/space/.-, max 22 chars) on checkout sessions; if PayMongo rejects the field, retry
  once without it so checkout never breaks.
- Add an in-app **Review your order** modal before redirecting: file, print type, pages × copies,
  line items, total, and "**Pay to AZR PRINT'S**".
- Document in `SETUP.md` that the hosted-page merchant name must be changed in the PayMongo Dashboard
  (business profile) or via PayMongo support.

### R6. Admin analytics dashboard + colorful cards
- Date range filter (Last 7 / 30 / 90 days, Last 12 months, All time) in one row above everything,
  with **Export report** on the right.
- 8 **colorful KPI cards** (gradient tiles, white text ≥ 4.5:1 contrast): Revenue (paid), Orders,
  Pages printed, Jobs in queue, Unpaid orders, Completed, Open tickets, Students.
- Charts (Chart.js, client-only via `next/dynamic` with `ssr:false`):
  Revenue trend (line/area, one series), Orders by print type (stacked bars: Document B&W / Document
  color / Photo), Payment status (doughnut), Job status (horizontal bars, status colors), Top customers
  by spend (horizontal bars), Tickets by topic (horizontal bars). Bucket by day ≤ 45 days, week ≤ 120,
  else month.
- Data-viz rules: no dual axes; legend for ≥ 2 series; value labels at bar ends; tooltip on hover;
  a **"View as table"** under every chart; empty-state message when there's no data.
- Palette: `#2a78d6`, `#eb6834`, `#1baf7a`; status good `#0ca30c`, warning `#fab219`,
  critical `#d03b3b`, muted `#9ca3af`.
- Server page pages through Supabase in chunks of 1,000 rows (the default max).
- Recent orders table at the bottom. See `after/admin-01-dashboard-full.jpg`, `after/admin-13-dashboard-mobile.jpg`.

### R7. Data export and reporting (one click: CSV, Excel, PDF)
- Reusable `ExportMenu` (CSV, Excel (.xlsx), PDF report) + `src/lib/export.ts`.
- Use it on the Admin dashboard (PDF includes branded header, KPI tiles, all charts as images and the
  orders table), Manage Orders, Order Files, Manage Users, Tickets, and the student's My Orders.
  Exports respect the current search/filters.
- CSV: UTF-8 BOM; block formula injection (prefix `'` to text starting with `= + - @`).
- Excel: bold dark header row, column widths, frozen header, numeric `₱` currency format, dates
  shifted so Excel shows the viewer's local time; extra "Summary" sheet with the KPIs.
- PDF: A4 (landscape for wide tables or charts), charts scaled **without distortion**, page numbers,
  amounts as `PHP 1,234.00` (core PDF fonts have no ₱ glyph).
- Success/error toast after each export. See `after/admin-03-export-menu.jpg`,
  `after/export-pdf-report-page-*.jpg`.

### R8. Toast notification popups
- Global `FeedbackProvider` in the root layout exposing `useToast()` (success / error / warning / info,
  optional link, auto-dismiss, pause on hover, `aria-live`) and `useConfirm()` (promise-based styled
  dialog built on native `<dialog>`, danger tone).
- Replace every `alert()`/`confirm()` in the app. See `after/admin-04-export-toasts.jpg`.

### R9. Client note: PDF recommended / warning
- "PDF recommended" badge next to the upload field.
- When printing type is Document and the file is not a PDF: an inline amber warning explaining that
  Word files can shift fonts, margins and page breaks. The **Review your order** modal repeats the
  warning with **Use a PDF instead** (re-opens the file picker) and **Pay anyway**.
- Replacing an order file with a .doc/.docx shows a warning toast.
- See `after/student-02-docx-pdf-warning.jpg`, `after/student-03-review-and-pay-modal.jpg`.

### R10. Client note: logout confirmation (Yes / No)
- Title "Log out of AZR PRINT'S?", buttons **No, stay** / **Yes, log out**. Used by both the sidebar and
  the profile dropdown. See `after/admin-07-logout-yes-no-modal.jpg`.

### R11. Client note: logout at the very bottom + tab arrangement
- Sidebar is sticky full height on desktop; nav scrolls; **Logout pinned to the bottom**.
- Admin groups: Overview (Dashboard) · Print shop (Manage Orders, Order Files, Printer, Tickets) ·
  Management (Manage Users, Pricing, Notifications, Settings) · Account (Profile).
- Student groups: Printing (New Order, My Orders) · Help (Support, Notifications) · Account (Profile).
- Icons on every item; mobile slide-in drawer with close button. See `after/admin-14-sidebar-mobile.jpg`.

### R12. Client note: "Document vs Photo — what exactly?"
- Two explained radio cards: **Document** ("Reports, modules, forms, assignments. Pages with pictures are
  detected and charged at the photo rate.") and **Photo** ("Photo prints from JPG or PNG images.
  Charged per print.").
- Tip below: printing many documents with photos → choose Document and combine into one PDF; text pages
  and photo pages are counted separately.
- Colorful price cards: Document B&W per page, Document color per page, Photo per print.
  See `after/student-01-new-order.jpg`.

### R13. Bug: Printer page stuck on "Loading…"
- `GET /api/admin/printer`: `maybeSingle()`, create the default row if missing, return readable errors
  (e.g. "Run migration 002"). Migration 004 seeds the row and adds an admin insert policy.
- Page shows a red error card with **Try again** instead of loading forever; saving uses toasts;
  `max_job_retries = 0` must be allowed. See `after/admin-10-printer-page-fixed.jpg`.

## Database: migration 004 specification

`supabase/migrations/004_notifications_avatars_attachments.sql` (idempotent):

- `profiles.avatar_url text`; bucket `avatars` (public, 2 MB, jpeg/png/webp/gif) + storage policies:
  select authenticated; insert/update/delete only `(storage.foldername(name))[1] = auth.uid()`.
- Printer settings: insert row `id = 1` if the table exists; policy `printer_settings_insert_admin`.
- `notifications.audience text not null default 'all'` with check `('all','users','admin')`,
  `notifications.link text`; re-target old webhook broadcast rows to `admin`; partial index for broadcasts.
- Replace the select policy with: `user_id = auth.uid() OR (user_id IS NULL AND (audience IN ('all','users') OR is_admin()))`;
  admin delete policy.
- `notification_reads(notification_id bigint, user_id uuid, read_at, PK both)` with own-row RLS.
- `alter publication supabase_realtime add table public.notifications` (guarded).
- Trigger functions (`security definer`, `search_path = public`): `notify_order_events`
  (after insert/update of status, payment_status on orders), `notify_ticket_created`,
  `notify_ticket_message`, helper `peso(numeric)`.
- `ticket_messages`: `attachment_path`, `attachment_name`, `attachment_type`, `attachment_size`;
  `body default ''`; constraint `length(btrim(body)) > 0 OR attachment_path IS NOT NULL` (`NOT VALID`).
- Bucket `ticket-files` (private, 10 MB, the MIME list from R3) + policies: insert/select/delete when
  folder[1] = auth.uid() or `is_admin()`.

## Target file map

New: `src/components/ui/{feedback.tsx,Modal.tsx,Avatar.tsx,useDismiss.ts}`, `src/components/{Providers,
ProfileMenu,NotificationBell,NotificationIcon,NotificationInbox,AvatarUploader,TicketAttachment,ExportMenu}.tsx`,
`src/components/dashboard/{AdminAnalytics,AdminAnalyticsLoader,KpiCard,ChartCard}.tsx`, `chart-theme.ts`,
`src/lib/{notifications,ticket-files,export,order-export,analytics}.ts`,
`src/app/user/notifications/page.tsx`, `src/app/api/profile/avatar/route.ts`,
`src/app/api/tickets/[id]/attachments/[messageId]/route.ts`, migration 004.

Changed: `AppShell.tsx`, `TicketThread.tsx`, `OrderFileActions.tsx`, root/admin/user `layout.tsx`,
`globals.css`, `types.ts`, `paymongo.ts`, all admin pages (dashboard, orders, files, users, tickets,
notifications, printer, pricing, settings, profile), student pages (dashboard, orders, tickets, profile),
APIs (tickets, ticket messages, admin notifications, admin printer, confirm-payment, webhook),
`README.md`, `SETUP.md`, `.env.example` (`PAYMONGO_STATEMENT_DESCRIPTOR`), `package.json`.

## Verification (must all pass)

1. `npm install`, then `npx tsc --noEmit` → 0 errors; `npm run lint` → 0 errors
   (watch the React-compiler rules: no synchronous `setState` in effects, no ref reads during render,
   no components created during render); `npm run build` → success.
2. Run migrations 001 → 004 on Supabase; run 004 a second time to prove it is idempotent.
3. Manual tests as a **student**: new order with a DOCX (warning + review modal) and a PDF; logout →
   No keeps you signed in, Yes signs out; create ticket with an attachment; admin reply arrives live
   and pops a toast; download both sides' files; change/remove profile picture (header updates);
   bell badge clears with "Mark all as read"; export My Orders to CSV/Excel/PDF.
4. Manual tests as an **admin**: dashboard ranges change every card and chart; export the report in all
   three formats and open them (charts not stretched, Excel times correct, ₱ format); change an order's
   job status (student gets a notification); post and delete an announcement per audience; Printer page
   loads or shows Try again; check at 390 px width.
5. Security checks: a student cannot download another student's ticket file or order file (403); a student
   cannot see admin broadcasts; CSV of a file named `=HYPERLINK("x")` opens as text.

## Report back

List each requirement R1–R13 as **Already done / Fixed / Built**, the files you changed, the command
outputs from step 1, and anything you could not verify (for example, live PayMongo checkout).
