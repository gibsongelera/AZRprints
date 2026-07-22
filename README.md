# AZR PRINT'S

Cloud-ready campus printing portal for **Zamboanga Peninsula Polytechnic State University (ZPPSU)**.

Stack: **Next.js** · **Supabase** (Auth, Postgres, Storage) · **PayMongo** · **Vercel**

## Quick start

See **[SETUP.md](./SETUP.md)** for full local setup, Supabase SQL, PayMongo webhooks, and Vercel deployment steps.

```bash
npm install
cp .env.example .env.local
# fill env values, run SQL migration
npm run dev
```

## Features

- Student signup/login and print order submission with file upload
- Automatic page detection (PDF / DOCX / images)
- PayMongo hosted checkout (GCash, Maya, cards)
- Admin dashboard: orders, users, pricing, settings, notifications
