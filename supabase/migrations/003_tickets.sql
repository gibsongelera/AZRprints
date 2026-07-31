-- Ticketing & admin chat

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  category text not null default 'general'
    check (category in ('order_issue', 'payment', 'printer', 'report', 'general')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_status_updated_idx on public.tickets (status, updated_at desc);
create index if not exists ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id, created_at asc);

create or replace function public.touch_ticket_on_message()
returns trigger language plpgsql as $$
begin
  update public.tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_ticket_on_message on public.ticket_messages;
create trigger trg_touch_ticket_on_message
  after insert on public.ticket_messages
  for each row execute function public.touch_ticket_on_message();

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

drop policy if exists "tickets_select_own_or_admin" on public.tickets;
create policy "tickets_select_own_or_admin" on public.tickets
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own" on public.tickets
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tickets_update_own_or_admin" on public.tickets;
create policy "tickets_update_own_or_admin" on public.tickets
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "ticket_messages_select_own_or_admin" on public.ticket_messages;
create policy "ticket_messages_select_own_or_admin" on public.ticket_messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "ticket_messages_insert_own_or_admin" on public.ticket_messages;
create policy "ticket_messages_insert_own_or_admin" on public.ticket_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.ticket_messages;
exception when duplicate_object then null;
end $$;
