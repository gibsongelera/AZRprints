# AZR PRINT'S

Cloud-ready campus printing portal for **Zamboanga Peninsula Polytechnic State University (ZPPSU)**.

Stack: **Next.js** · **Supabase** (Auth, Postgres, Storage) · **PayMongo** · **Vercel** · **Local print worker**

## Quick start

See **[SETUP.md](./SETUP.md)** for local setup, Supabase SQL, PayMongo webhooks, and Vercel deployment.

**Printer automation:** [docs/PRINTER_SETUP.md](./docs/PRINTER_SETUP.md)  
**Production & hardening:** [docs/PRODUCTION.md](./docs/PRODUCTION.md)

```bash
npm install
cp .env.example .env.local
# fill env values, run SQL migrations 001 + 002
npm run dev
```

## Features

- Student signup/login and print order submission with file upload
- Automatic page and **mixed-content** detection (PDF / DOCX / images)
- Itemized pricing (document pages + photo pages) from admin rates
- PayMongo hosted checkout (GCash, Maya, cards, InstaPay QR Ph)
- **Auto-queue print jobs** after confirmed payment
- Local **print worker** for the shop PC (direct printer integration)
- Admin dashboard: orders, users, pricing, printer settings, notifications

## Print worker (shop laptop)

```bash
cd print-worker
cp .env.example .env
npm install
npm run list-printers
npm start
```

Requires migration `supabase/migrations/002_print_queue.sql` and admin → **Printer** settings enabled.

## Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial.sql` | Core schema, RLS, storage |
| `supabase/migrations/002_print_queue.sql` | `print_jobs`, `printer_settings`, mixed-content columns |

## Design reference

UI follows the legacy **AZR PRINT'S** layout in [`.reference/`](./.reference/) (sidebar, pricing cards, accent styling).
