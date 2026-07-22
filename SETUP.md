# AZR PRINT'S — Setup & Deployment Guide

Next.js + Supabase + PayMongo campus printing portal for Zamboanga Peninsula Polytechnic State University (ZPPSU).

## Deploy checklist (Vercel)

1. Run SQL migration on Supabase project `jrvkfgdqfcidnxyybrwj` (see section 2).
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Project Settings → API).
3. Push repo to GitHub.
4. Import on [vercel.com/new](https://vercel.com/new) → set env vars (section 4C).
5. Deploy → set `NEXT_PUBLIC_APP_URL` → redeploy.
6. Register PayMongo webhook → set `PAYMONGO_WEBHOOK_SECRET` → redeploy.
7. Update Supabase Auth Site URL to the Vercel domain.
8. Sign up → promote admin via SQL → test one paid order.

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) free project
- A [PayMongo](https://dashboard.paymongo.com) account (test keys are fine)
- A [Vercel](https://vercel.com) account (Hobby / free)
- GitHub repository for this project

## 1. Local setup

```bash
git clone <your-repo-url>
cd capstoneshan
npm install
cp .env.example .env.local
```

Fill `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYMONGO_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find keys**

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (server only; never expose to the browser) |
| PayMongo keys | PayMongo Dashboard → Developers → API Keys |

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 2. Supabase database setup

> **Important:** Run this SQL on the same project as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
> (for this capstone: `https://jrvkfgdqfcidnxyybrwj.supabase.co`).

1. Open that Supabase project → **SQL Editor**.
2. Paste and run the full script in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).
3. Confirm tables exist: `profiles`, `pricing`, `shop_settings`, `orders`, `notifications`.
4. Confirm Storage bucket `order-files` exists (private).

### Auth URL configuration (local)

Supabase → **Authentication** → **URL Configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

Optional: disable **Confirm email** under Auth → Providers → Email while testing.

### Create the first admin

1. Sign up at `/signup` with your admin email.
2. In SQL Editor run:

```sql
update public.profiles
set role = 'admin',
    name = 'Admin',
    department = 'IT & Printing Services'
where id = (
  select id from auth.users where email = 'your-admin@email.com'
);
```

## 3. PayMongo setup

1. Use **Test** API keys while developing.
2. Enable payment methods on your account (Dashboard → Developers → Payment Methods): **QR Ph (InstaPay)**, **GCash**, **Maya**, **Card**. QR Ph may require activation approval; the app falls back gracefully if a method is unavailable.
3. After you have a public HTTPS URL (Vercel), add a webhook:
   - Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://YOUR_DOMAIN/api/paymongo/webhook`
   - Events: `checkout_session.payment.paid`, `link.payment.paid`, `payment.paid`, `payment.failed`
4. Copy the webhook signing secret into `PAYMONGO_WEBHOOK_SECRET`.
5. Redeploy / restart so the secret is loaded.

Checkout flow:

1. Student uploads a file and creates an order.
2. App creates a PayMongo **Checkout Session** preferring **InstaPay (QR Ph)** and GCash (falls back to a Payment Link if sessions are unavailable).
3. Student pays on PayMongo hosted checkout (InstaPay QR Ph / GCash / Maya / card).
4. Webhook marks the order `payment_status = paid` and `status = in_progress`.

## 4. Vercel deployment (step by step)

### A. Push to GitHub

```bash
git add .
git commit -m "Migrate AZR PRINT'S to Next.js, Supabase, and PayMongo"
git push -u origin main
```

### B. Import project on Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new).
2. **Import** your GitHub repository.
3. Framework preset: **Next.js** (auto-detected).
4. Root Directory: `.` (repo root).
5. Build command: `npm run build` (default).
6. Output: default Next.js output.

### C. Environment variables

In Vercel → Project → **Settings** → **Environment Variables**, add for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `PAYMONGO_SECRET_KEY` | `sk_test_...` (or live later) |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | `pk_test_...` |
| `PAYMONGO_WEBHOOK_SECRET` | from PayMongo webhook (can add after first deploy) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (update after first deploy) |

### D. Deploy

1. Click **Deploy**.
2. Wait for the build to finish.
3. Copy the production URL (e.g. `https://azr-prints.vercel.app`).
4. Update `NEXT_PUBLIC_APP_URL` to that URL → **Save** → **Redeploy**.

### E. Wire PayMongo webhook

1. PayMongo → Developers → Webhooks.
2. URL: `https://your-app.vercel.app/api/paymongo/webhook`
3. Events: `checkout_session.payment.paid`, `link.payment.paid`, `payment.paid`, `payment.failed`
4. Copy signing secret → Vercel env `PAYMONGO_WEBHOOK_SECRET` → Redeploy.

### F. Wire Supabase Auth URLs (production)

Supabase → Authentication → URL Configuration:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs include:
  - `https://your-app.vercel.app/**`
  - `http://localhost:3000/**`

## 5. Post-deploy checklist

- [ ] Open `/signup`, create a student account
- [ ] Promote one user to `admin` via SQL
- [ ] Admin can open `/admin/dashboard` and edit pricing
- [ ] Student creates an order and is redirected to PayMongo test checkout
- [ ] After test payment, order shows `payment_status = paid`
- [ ] Admin can set job status to `completed`
- [ ] No secrets committed (`.env*` is gitignored; only `.env.example` is tracked)

## 6. Free-tier notes

| Service | Free limits (approximate) | When to upgrade |
|---------|---------------------------|-----------------|
| Supabase | 500 MB DB, 1 GB storage, 50k MAU | Large file archives or high traffic |
| Vercel Hobby | Serverless functions, bandwidth limits | Custom domains + team features still free on Hobby for many cases |
| PayMongo | Test mode free; live has transaction fees | Only when accepting real money |

Upload size is capped at **10 MB** per file in the API and Storage bucket.

## 7. Security notes

- Never commit `SUPABASE_SERVICE_ROLE_KEY` or `PAYMONGO_SECRET_KEY`.
- Rotate PayMongo test keys if they were shared in chat or screenshots.
- This Supabase project may contain other tables from previous work. Ensure RLS is enabled on any sensitive tables you still use.
- Profile RLS prevents users from changing their own `role` to `admin`.

## 8. Useful scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # run production build locally
npm run lint     # ESLint
```

## 9. Project structure (high level)

```
src/app/                 # App Router pages + API routes
src/components/          # Shared UI (AppShell)
src/lib/supabase/        # Browser / server / admin clients + middleware helper
src/lib/paymongo.ts      # Checkout Sessions (InstaPay/QRPh preferred) + Payment Link fallback + webhook signature verify
supabase/migrations/     # SQL schema + RLS + storage policies
SETUP.md                 # This file
```

## Support contacts (business)

Use your official business email / phone in PayMongo KYC. App support email used during onboarding: configure in shop settings or PayMongo dashboard as needed.
