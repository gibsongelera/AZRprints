# Client revisions — October 2026

Source: client walkthrough videos (student side + admin side) and the handwritten
"SHEI – System / User side" notes, plus the developer's update list.

## Before you run it

1. In Supabase → SQL Editor, run `supabase/migrations/004_notifications_avatars_attachments.sql`
   (after 001–003). It is idempotent.
2. `npm install` (new packages: chart.js, react-chartjs-2, jspdf, jspdf-autotable,
   write-excel-file, lucide-react).
3. Optional env: `PAYMONGO_STATEMENT_DESCRIPTOR` (default `AZR PRINTS`).

## Requests and what changed

| Request | Implementation | Main files |
|---|---|---|
| Profile drop-down on the avatar, all pages | Avatar button opens a menu: name, email, role, My profile, Settings/Support, Notifications, Log out | `components/ProfileMenu.tsx`, `components/AppShell.tsx` |
| Notification icon | Bell with unread badge, dropdown, mark read / mark all, "View all" page; live via Supabase Realtime; new items also pop up as toasts. DB triggers create notifications for new orders, payments, status changes, new tickets and replies | `components/NotificationBell.tsx`, `components/NotificationInbox.tsx`, `app/user/notifications`, `app/admin/notifications`, migration 004 |
| Ticket file upload + download | Paperclip on New ticket and in the chat composer (PDF, Office, text/CSV, images, up to 10 MB). Files go straight to the private `ticket-files` bucket; the API verifies them. Student and admin get View + Download on every attachment | `components/TicketThread.tsx`, `components/TicketAttachment.tsx`, `lib/ticket-files.ts`, `api/tickets/**` |
| Change profile picture | Upload / change / remove on student and admin profile; auto square-crop to 512 px; shown in the header | `components/AvatarUploader.tsx`, `api/profile/avatar` |
| Hide "Gibson Gelera" on payment | Checkout sends `statement_descriptor` (business name); in-app "Review your order" step shows *Pay to AZR PRINT'S*. The name on PayMongo's hosted page comes from the PayMongo account profile and must be changed there (see SETUP.md §3.6) | `lib/paymongo.ts`, `app/user/dashboard/page.tsx` |
| Admin analytics charts + colorful cards | 8 colorful KPI cards; revenue trend, orders by print type, payment status, job status, top customers, tickets by topic; date range filter; "View as table" under each chart | `components/dashboard/*`, `lib/analytics.ts`, `app/admin/dashboard/page.tsx` |
| CSV / Excel / PDF export | Export menu on the dashboard (PDF includes KPIs + charts + table), Manage Orders, Order Files, Manage Users, Tickets and the student's My Orders. Exports follow the current filters | `lib/export.ts`, `components/ExportMenu.tsx` |
| Toast popups | Global toasts replace every `alert()`; styled Yes/No dialogs replace `confirm()` | `components/ui/feedback.tsx`, `components/ui/Modal.tsx` |
| Client note: PDF required / warning | "PDF recommended" badge, inline warning for Word files, and the review step offers "Choose a PDF instead" or "Continue anyway, pay ₱…" before paying | `app/user/dashboard/page.tsx` |
| Client note: logout confirmation | "Log out of AZR PRINT'S?" with *No, stay* / *Yes, log out* | `components/AppShell.tsx` |
| Client note: logout at the bottom, tab arrangement | Sidebar grouped (Overview, Print shop, Management, Account / Printing, Help, Account) with icons; Logout pinned to the bottom | `components/AppShell.tsx` |
| Client note: Document vs Photo — what exactly? | Two explained choices plus a tip: many documents with photos → choose Document, combine into one PDF; photo pages are counted and billed separately | `app/user/dashboard/page.tsx` |
| Bug seen in admin video: Printer page stuck on "Loading…" | API now creates the missing settings row and returns readable errors; the page shows an error with "Try again" instead of spinning forever | `api/admin/printer/route.ts`, `app/admin/printer/page.tsx` |

## Notes

- Notification visibility is enforced by RLS: students see their own + "Everyone"/"Students"
  broadcasts; admins see their own + "Everyone"/"Admins" broadcasts.
- PDF exports write amounts as `PHP 1,234.00` because the built-in PDF fonts have no ₱ glyph;
  CSV/Excel keep numbers numeric (Excel cells are formatted with ₱).
- The duplicate "Payment received" inserts in `confirm-payment` and the webhook were removed;
  the database trigger now creates those notifications once.

## CRUD coverage (follow-up)

| Module | Create | Read | Update | Delete |
|---|---|---|---|---|
| Orders (admin) | — (students place orders) | Manage Orders table + **Details** modal (customer, payment, print jobs) | Job status | **Delete order** (file + print jobs removed; blocked while printing) |
| Orders (student) | New Order | My Orders | Replace file while unpaid, **Cancel order** | **Delete** unpaid pending/cancelled orders |
| Order files | Upload | View / Download | Replace | Delete |
| Users | Add user | Manage Users | Edit | Delete |
| Tickets | New ticket | Inbox / thread | Staff: status, topic. Student: **Edit ticket**, **Close / Reopen** | Staff: **Delete ticket**. Student: while staff haven't replied |
| Ticket messages | Send (with file) | Thread | **Edit** own message (marked "edited") | **Delete** own message; staff can delete any |
| Announcements | Publish | Announcements tab | **Edit** | Delete |
| Notifications | Automatic (triggers) | Bell + page | Mark read | **Delete** own personal notifications |
| Print queue | **Send to printer** (order details) | **Print queue** on the Printer page | **Retry / Print again**, **Cancel** | **Delete** finished jobs |
| Pricing, shop settings, printer settings | — (single row) | Pages | Save | — |

Security fixes found during the audit (migration 004, section 5):

- Students could update their own order rows directly with the public key, including
  `payment_status`, `amount` and `paymongo_link_id` (mark an order paid without paying). A trigger
  now blocks this; the checkout and payment-confirmation routes write those fields with the
  service role.
- Students could insert an order with any price or status. Inserts are now re-priced in the
  database and forced to unpaid.
- Students could replace the file of a paid order (pay for 1 page, print 100). The file is now
  locked once paid (the API returns a clear message).

Verified on a local Postgres (PGlite) with Supabase stubs: migrations 001 → 004 run, 004 runs a
second time, and 60 permission checks pass (student vs other student vs admin vs server).
