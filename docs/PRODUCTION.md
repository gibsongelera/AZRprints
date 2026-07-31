# Production: PayMongo, Supabase, and hardening

## Live PayMongo

1. Switch PayMongo dashboard to **Live** API keys.
2. Vercel env (Production):
   - `PAYMONGO_SECRET_KEY=sk_live_…`
   - `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_live_…`
3. Register webhook URL: `https://YOUR_DOMAIN/api/paymongo/webhook`
   - Events: `checkout_session.payment.paid`, `payment.paid`, `link.payment.paid` (as available)
4. Copy webhook signing secret → `PAYMONGO_WEBHOOK_SECRET` → redeploy.
5. Set checkout `success_url` / `cancel_url` via `NEXT_PUBLIC_APP_URL` (must be HTTPS).

## Supabase sync

1. Production Supabase project matches `NEXT_PUBLIC_SUPABASE_URL`.
2. Run migrations `001_initial.sql` and `002_print_queue.sql` on production.
3. Auth → URL Configuration:
   - Site URL: `https://YOUR_DOMAIN`
   - Redirect URLs: `https://YOUR_DOMAIN/**`
4. Storage bucket `order-files` remains **private**; only service role + owner RLS.
5. Promote admin via SQL on production (same as SETUP.md).

## Print worker in production

- Deploy Next.js to Vercel only.
- Run `print-worker` on the physical shop machine (see [PRINTER_SETUP.md](./PRINTER_SETUP.md)).
- **Do not** put `SUPABASE_SERVICE_ROLE_KEY` in Vercel if the worker already uses it locally; Vercel still needs service role for webhooks and server routes — restrict key rotation and use Supabase audit logs.

## Enterprise hardening checklist

| Area | Action |
|------|--------|
| Secrets | All keys in Vercel/env files; rotate after capstone demo |
| Webhooks | Always set `PAYMONGO_WEBHOOK_SECRET` in production |
| RLS | Verify non-admin cannot read other users' orders/files |
| Service role | Only server routes + print worker; never `NEXT_PUBLIC_*` |
| Storage | 10MB limit; MIME allowlist on bucket |
| Auth | Re-enable email confirmation for production |
| HTTPS | Force HTTPS on Vercel; HSTS default |
| Admin | Minimum number of admin accounts; MFA on Supabase org |
| Backups | Enable Supabase PITR on paid plan or export weekly |
| Logging | PayMongo dashboard + Supabase logs for failed payments |
| Worker | Single instance; locked job claims; spool cleanup |
| PCI | No card data touches your server (PayMongo hosted checkout) |

## Review summary (this release)

### Fixed / improved

- Payment webhook and `/api/orders/confirm-payment` now **enqueue** `print_jobs` after `paid`.
- Mixed-content **pricing breakdown** on upload (text + photo pages).
- **PDF/DOCX/image** content heuristics for photo vs document pages.
- Admin **Printer** settings for auto-queue and poll/retry/spool retention.
- Local **print worker** with atomic job claim and safe spool directory.

### Remaining risks

- Client-submitted page counts are not re-validated server-side with PDF parsing (trust + sanity bounds only).
- DOCX page count remains estimated; embedded image detection is approximate.
- Unattended printing of Office formats depends on OS handlers.
- Compromised `SUPABASE_SERVICE_ROLE_KEY` on shop PC grants full DB access — physical security matters.
- No automatic printer status feedback (paper jam, offline) back to the portal.
