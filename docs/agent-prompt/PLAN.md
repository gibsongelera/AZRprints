# AZR PRINT'S: client revision plan (October 2026)

Campus printing portal for ZPPSU (Next.js 16 + Supabase + PayMongo, deployed on Vercel).
This plan combines the developer's update list with the client's walkthrough videos and handwritten
notes. Every picture referenced here is in the `images/` folder next to this file.

- `images/client/`: frames taken from the two client videos (what the client showed and wrote)
- `images/after/`: screenshots of the finished update running on test data, plus sample exports

The paste-ready prompt for an AI coding agent is in [`AGENT-PROMPT.md`](AGENT-PROMPT.md).

---

## 1. What the client asked for

### 1.1 Handwritten notes ("SHEI – SYSTEM, USER SIDE")

![Client notes, top](images/client/notebook-user-side-1.jpg)
![Client notes, middle](images/client/notebook-user-side-2.jpg)
![Client notes, last line](images/client/notebook-user-side-3.jpg)

Transcription:

1. **PDF required for uploading.** Show a warning when submitting a different format, because it
   could mess up the template of the documents, so PDF is highly suggested.
2. **When logging out**, there must be a confirmation modal like "Yes" and "No" before fully logging out.
3. **The log-out button must be placed at the very bottom of the sidebar.** Further: rearrange the
   button/tab list.
4. **"Document and Photo are the two options to choose, but what exactly?** Let's say, what if I will
   print a ton of documents with photos?"

(Legend at the top of the page: yellow highlight = format issues, orange highlight = content and
adjustments. "Payment gateway" is crossed out as done.)

### 1.2 Developer's update list

- Profile drop-down on the avatar icon on every page
- Notification icon
- Submit Ticket: upload-file button, with a download button so the student and admin can download it
- Profile: upload / change profile picture
- Payment: hide or remove the "Gibson Gelera" name
- Admin dashboard: analytics charts and colorful cards
- Data export and reporting: one-click CSV, Excel or PDF for table data and charts
- Toast notification popups

### 1.3 What the videos showed (before)

| Student side (video 1) | |
|---|---|
| ![New Order before](images/client/video1-student-new-order-before.jpg) | ![My Orders before](images/client/video1-student-my-orders-before.jpg) |
| New Order: two unexplained type buttons, no PDF guidance | My Orders |
| ![Support before](images/client/video1-student-support-before.jpg) | ![Profile before](images/client/video1-student-profile-before.jpg) |
| Support: text only, no file upload | Profile: no picture |

| Admin side (video 2) | |
|---|---|
| ![Dashboard before](images/client/video2-admin-dashboard-before.jpg) | ![Tickets before](images/client/video2-admin-tickets-before.jpg) |
| Dashboard: four plain numbers + a table, no charts | Tickets: text-only chat |
| ![Manage Orders before](images/client/video2-admin-manage-orders-before.jpg) | ![Order Files before](images/client/video2-admin-order-files-before.jpg) |
| Manage Orders: no search, filters or export | Order Files |
| ![Pricing before](images/client/video2-admin-pricing-before.jpg) | ![Users before](images/client/video2-admin-users-before.jpg) |
| Pricing | Manage Users: no search or export |

**Bug found in video 2:** the Printer page never finishes loading.

![Printer stuck loading](images/client/video2-admin-printer-stuck-loading.jpg)

Cause: the page ignored error responses from `/api/admin/printer`, and the API used `.single()`, which
fails when the settings row is missing.

---

## 2. Plan

| # | Work | Frontend | Backend / database |
|---|---|---|---|
| 1 | Profile dropdown (all pages) | Avatar + name + chevron in the header; menu with profile, settings/support, notifications, log out | — |
| 2 | Notification bell (all pages) | Unread badge, dropdown, mark read / all, "View all" page, live toasts | Migration 004: `audience`, `link`, `notification_reads`, realtime, auto-notify triggers; RLS by audience |
| 3 | Ticket attachments | Paperclip on New ticket and in the chat; View + Download for both sides | Private `ticket-files` bucket; direct browser upload (avoids Vercel's 4.5 MB limit); API verifies; signed-URL download route |
| 4 | Profile picture | Upload / change / remove, auto square crop, header updates | Public `avatars` bucket, `profiles.avatar_url`, `/api/profile/avatar` |
| 5 | Hide "Gibson Gelera" | "Review your order" modal: *Pay to AZR PRINT'S* | PayMongo `statement_descriptor` (env `PAYMONGO_STATEMENT_DESCRIPTOR`), safe retry; dashboard step documented |
| 6 | Analytics dashboard | 8 colorful KPI cards, 6 charts, date range, table view per chart | Server page pages through Supabase (1,000-row chunks) |
| 7 | CSV / Excel / PDF export | Export menu on dashboard, orders, files, users, tickets, My Orders | — |
| 8 | Toast popups | Global toasts + styled confirm dialog; no `alert()`/`confirm()` left | — |
| 9 | PDF warning (client note 1) | Badge, inline warning, review step with "Use a PDF instead" | — |
| 10 | Logout Yes/No (client note 2) | Confirmation dialog | — |
| 11 | Logout at bottom + tab arrangement (client note 3) | Grouped sidebar with icons, logout pinned to the bottom | — |
| 12 | Document vs Photo (client note 4) | Explained choice cards, tip for documents with photos, colorful price cards | Existing mixed-page detection stays |
| 13 | Printer page bug | Error card with "Try again" | API auto-creates the row; migration 004 seeds it + admin insert policy |

Rules followed: one idempotent migration, permissions enforced by RLS and server checks, the existing
brand kept (navy sidebar, red accent, Inter/Hanken Grotesk), accessible at 390 px width.

---

## 3. Result (after)

### Admin

![Dashboard](images/after/admin-01-dashboard-full.jpg)
*Analytics dashboard: date range, colorful KPI cards, six charts with "View as table", recent orders.*

![Dashboard 90 days](images/after/admin-02-dashboard-90-days.jpg)
*Changing the range re-buckets the charts (weekly for 90 days).*

| | |
|---|---|
| ![Export menu](images/after/admin-03-export-menu.jpg) | ![Export toasts](images/after/admin-04-export-toasts.jpg) |
| Export report: CSV, Excel, PDF | Toast after each export |
| ![Bell](images/after/admin-05-notification-bell.jpg) | ![Profile dropdown](images/after/admin-06-profile-dropdown.jpg) |
| Notification bell | Profile dropdown on the avatar |
| ![Logout modal](images/after/admin-07-logout-yes-no-modal.jpg) | ![Tickets](images/after/admin-08-tickets-with-attachments.jpg) |
| Logout "No, stay / Yes, log out" | Tickets with attachments (View / Download) |
| ![Manage orders](images/after/admin-09-manage-orders-filters-export.jpg) | ![Printer fixed](images/after/admin-10-printer-page-fixed.jpg) |
| Manage Orders: search, filters, export | Printer page loads (bug fixed) |
| ![Announcements](images/after/admin-11-announcements.jpg) | ![Users](images/after/admin-12-manage-users.jpg) |
| Announcements with audience | Manage Users: search, role filter, export |

| Mobile | |
|---|---|
| ![Dashboard mobile](images/after/admin-13-dashboard-mobile.jpg) | ![Sidebar mobile](images/after/admin-14-sidebar-mobile.jpg) |

### Student

| | |
|---|---|
| ![New order](images/after/student-01-new-order.jpg) | ![DOCX warning](images/after/student-02-docx-pdf-warning.jpg) |
| Explained Document / Photo choice, colorful price cards | Inline warning for a Word file |
| ![Review modal](images/after/student-03-review-and-pay-modal.jpg) | ![Support](images/after/student-04-support-new-ticket-attach.jpg) |
| Review step: PDF warning, *Pay to AZR PRINT'S* | New ticket with "Attach a file" |
| ![Thread](images/after/student-05-ticket-thread-attachments.jpg) | ![Profile picture](images/after/student-06-profile-picture.jpg) |
| Chat with downloadable files | Profile picture upload |
| ![Notifications](images/after/student-07-notifications-page.jpg) | ![Toast](images/after/student-08-mark-read-toast.jpg) |
| Notifications page | Toast after "Mark all as read" (badge cleared) |
| ![My orders](images/after/student-09-my-orders-export.jpg) | |
| My Orders with export | |

| Mobile | |
|---|---|
| ![New order mobile](images/after/student-10-new-order-mobile.jpg) | ![Bell mobile](images/after/student-11-bell-mobile.jpg) |

### Sample exports

![PDF page 1](images/after/export-pdf-report-page-1.jpg)
![PDF page 2](images/after/export-pdf-report-page-2.jpg)
![PDF page 3](images/after/export-pdf-report-page-3.jpg)

Files: [`export-sample-dashboard-report.pdf`](images/after/export-sample-dashboard-report.pdf),
[`export-sample-dashboard-report.xlsx`](images/after/export-sample-dashboard-report.xlsx)
(test data only).

---

## 4. Setup after pulling the update

1. Supabase → SQL Editor → run `supabase/migrations/004_notifications_avatars_attachments.sql`
   (after 001–003; it is safe to run again).
2. `npm install` (new packages: chart.js, react-chartjs-2, jspdf, jspdf-autotable, write-excel-file,
   lucide-react), then restart `npm run dev`.
3. Optional on Vercel: `PAYMONGO_STATEMENT_DESCRIPTOR=AZR PRINTS`.
4. If PayMongo's hosted checkout still shows a personal name: change the business name in the PayMongo
   Dashboard (business profile) or ask PayMongo support. The API can't override that header.

## 5. Notes and limits

- Notification visibility is enforced by RLS. Students see their own + "Everyone"/"Students" broadcasts;
  admins see their own + "Everyone"/"Admins" broadcasts.
- PDF exports write amounts as `PHP 1,234.00` because the built-in PDF fonts have no ₱ glyph;
  CSV/Excel keep numbers numeric (Excel cells are formatted with ₱).
- CSV exports neutralize spreadsheet formulas in text cells (file names are user input).
- Order file uploads still go through the API, so Vercel's 4.5 MB request limit applies to print
  files (unchanged from before). Ticket attachments upload directly to storage and can be up to 10 MB.
- Screenshots were taken against a local mock of Supabase with sample data; names and amounts are not
  real records.
