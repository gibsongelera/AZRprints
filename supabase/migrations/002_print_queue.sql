-- Print queue, mixed-content order fields, printer settings

alter table public.orders
  add column if not exists document_pages int not null default 0,
  add column if not exists photo_pages int not null default 0,
  add column if not exists content_label text;

create table if not exists public.printer_settings (
  id int primary key default 1 check (id = 1),
  auto_print_enabled boolean not null default true,
  direct_print_enabled boolean not null default true,
  default_printer_name text not null default '',
  poll_interval_seconds int not null default 15 check (poll_interval_seconds between 5 and 300),
  max_job_retries int not null default 3 check (max_job_retries between 0 and 10),
  spool_retention_hours int not null default 24 check (spool_retention_hours between 1 and 168),
  updated_at timestamptz not null default now()
);

insert into public.printer_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'printing', 'completed', 'failed', 'cancelled')),
  printer_name text not null default '',
  copies int not null default 1 check (copies >= 1),
  attempts int not null default 0,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists print_jobs_status_created_idx
  on public.print_jobs (status, created_at asc)
  where status in ('queued', 'printing');

create unique index if not exists print_jobs_one_active_per_order_idx
  on public.print_jobs (order_id)
  where status in ('queued', 'printing');

alter table public.printer_settings enable row level security;
alter table public.print_jobs enable row level security;

drop policy if exists "printer_settings_select_auth" on public.printer_settings;
create policy "printer_settings_select_auth" on public.printer_settings
  for select to authenticated
  using (true);

drop policy if exists "printer_settings_update_admin" on public.printer_settings;
create policy "printer_settings_update_admin" on public.printer_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "print_jobs_select_admin" on public.print_jobs;
create policy "print_jobs_select_admin" on public.print_jobs
  for select to authenticated
  using (public.is_admin());

drop policy if exists "print_jobs_select_own_order" on public.print_jobs;
create policy "print_jobs_select_own_order" on public.print_jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = print_jobs.order_id and o.user_id = auth.uid()
    )
  );

-- Atomic claim for local print worker (service role only in practice)
create or replace function public.claim_next_print_job(p_worker_id text, p_printer_name text default '')
returns setof public.print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.print_jobs;
begin
  select * into job
  from public.print_jobs
  where status = 'queued'
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update public.print_jobs
  set
    status = 'printing',
    locked_by = p_worker_id,
    locked_at = now(),
    updated_at = now(),
    attempts = attempts + 1,
    printer_name = coalesce(nullif(p_printer_name, ''), printer_name)
  where id = job.id
  returning * into job;

  return next job;
end;
$$;

revoke all on function public.claim_next_print_job(text, text) from public;
grant execute on function public.claim_next_print_job(text, text) to service_role;
