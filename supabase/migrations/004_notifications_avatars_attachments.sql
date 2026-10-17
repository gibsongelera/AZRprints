-- 004: Notification center, profile pictures, ticket file attachments,
--      CRUD permissions and order/ticket data guards (section 5)
-- Safe to run more than once (idempotent). Run after 001, 002 and 003.

-- ---------------------------------------------------------------------------
-- 1. Profile pictures
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_auth" on storage.objects;
create policy "avatars_select_auth" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 1b. Printer settings: make sure the singleton row exists and admins can
--     recreate it (fixes the Printer page staying on "Loading…").
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.printer_settings') is not null then
    insert into public.printer_settings (id) values (1) on conflict (id) do nothing;
    drop policy if exists "printer_settings_insert_admin" on public.printer_settings;
    create policy "printer_settings_insert_admin" on public.printer_settings
      for insert to authenticated
      with check (public.is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Notification center
--    user_id set            -> personal notification for that user
--    user_id null + audience -> broadcast: 'all' (everyone), 'users' (students), 'admin'
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists audience text not null default 'all',
  add column if not exists link text;

do $$
begin
  alter table public.notifications
    add constraint notifications_audience_check
    check (audience in ('all', 'users', 'admin'));
exception when duplicate_object then null;
end $$;

-- Older webhook rows were broadcast to everyone; they are admin-only information.
update public.notifications
set audience = 'admin'
where user_id is null
  and message like 'PayMongo payment confirmed for %';

create index if not exists notifications_broadcast_idx
  on public.notifications (audience, created_at desc)
  where user_id is null;

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
drop policy if exists "notifications_select_visible" on public.notifications;
create policy "notifications_select_visible" on public.notifications
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and (audience in ('all', 'users') or public.is_admin())
    )
  );

drop policy if exists "notifications_delete_admin" on public.notifications;
create policy "notifications_delete_admin" on public.notifications
  for delete to authenticated
  using (public.is_admin());

-- Per-user read receipts (works for personal and broadcast notifications)
create table if not exists public.notification_reads (
  notification_id bigint not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_reads_user_idx
  on public.notification_reads (user_id);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own" on public.notification_reads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own" on public.notification_reads
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "notification_reads_update_own" on public.notification_reads;
create policy "notification_reads_update_own" on public.notification_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notification_reads_delete_own" on public.notification_reads;
create policy "notification_reads_delete_own" on public.notification_reads
  for delete to authenticated
  using (user_id = auth.uid());

-- Live updates for the bell + toast popups
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Automatic notifications (database triggers = one source of truth,
--    works for the web app, the PayMongo webhook and the print worker alike)
-- ---------------------------------------------------------------------------
create or replace function public.peso(p_amount numeric)
returns text
language sql
stable
as $$
  select '₱' || to_char(coalesce(p_amount, 0), 'FM999,999,990.00');
$$;

create or replace function public.notify_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if tg_op = 'INSERT' then
    select coalesce(nullif(p.name, ''), 'A student') into v_name
    from public.profiles p where p.id = new.user_id;

    insert into public.notifications (user_id, audience, type, title, message, link)
    values (
      null, 'admin', 'info', 'New order',
      format('%s placed %s (%s) — %s.', coalesce(v_name, 'A student'), new.id, new.file_name, public.peso(new.amount)),
      '/admin/orders'
    );
    return new;
  end if;

  -- UPDATE
  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'paid' then
      insert into public.notifications (user_id, audience, type, title, message, link)
      values (
        new.user_id, 'all', 'success', 'Payment received',
        format('Your payment for %s was confirmed. Your print job is now in progress.', new.id),
        '/user/orders'
      );
      insert into public.notifications (user_id, audience, type, title, message, link)
      values (
        null, 'admin', 'success', 'Payment confirmed',
        format('%s was paid — %s.', new.id, public.peso(new.amount)),
        '/admin/orders'
      );
      -- Status moves to in_progress in the same update; one message is enough.
      return new;
    elsif new.payment_status = 'failed' then
      insert into public.notifications (user_id, audience, type, title, message, link)
      values (
        new.user_id, 'all', 'warning', 'Payment failed',
        format('Payment for %s did not go through. Open My Orders and choose Pay now to try again.', new.id),
        '/user/orders'
      );
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'cancelled' and auth.uid() = new.user_id then
      -- The student cancelled it themselves: tell the shop instead.
      insert into public.notifications (user_id, audience, type, title, message, link)
      values (
        null, 'admin', 'warning', 'Order cancelled by student',
        format('%s (%s) was cancelled by the student before payment.', new.id, new.file_name),
        '/admin/orders'
      );
      return new;
    end if;
    insert into public.notifications (user_id, audience, type, title, message, link)
    values (
      new.user_id,
      'all',
      case new.status when 'completed' then 'success' when 'cancelled' then 'warning' else 'info' end,
      case new.status
        when 'completed' then 'Order ready for pickup'
        when 'cancelled' then 'Order cancelled'
        when 'in_progress' then 'Order in progress'
        else 'Order updated'
      end,
      case new.status
        when 'completed' then format('%s is printed and ready for pickup.', new.id)
        when 'cancelled' then format('%s was cancelled. Open a support ticket if this is unexpected.', new.id)
        when 'in_progress' then format('%s is being printed.', new.id)
        else format('%s is now %s.', new.id, new.status)
      end,
      '/user/orders'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_order_events on public.orders;
create trigger trg_notify_order_events
  after insert or update of status, payment_status on public.orders
  for each row execute function public.notify_order_events();

create or replace function public.notify_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(nullif(p.name, ''), 'A student') into v_name
  from public.profiles p where p.id = new.user_id;

  insert into public.notifications (user_id, audience, type, title, message, link)
  values (
    null, 'admin', 'info', 'New support ticket',
    format('%s: %s', coalesce(v_name, 'A student'), new.subject),
    '/admin/tickets?id=' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_ticket_created on public.tickets;
create trigger trg_notify_ticket_created
  after insert on public.tickets
  for each row execute function public.notify_ticket_created();

-- ---------------------------------------------------------------------------
-- 4. Ticket attachments
-- ---------------------------------------------------------------------------
alter table public.ticket_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size int;

alter table public.ticket_messages alter column body set default '';

do $$
begin
  alter table public.ticket_messages
    add constraint ticket_messages_has_content
    check (length(btrim(body)) > 0 or attachment_path is not null) not valid;
exception when duplicate_object then null;
end $$;

create or replace function public.notify_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_subject text;
  v_name text;
  v_count int;
  v_preview text;
begin
  select t.user_id, t.subject into v_owner, v_subject
  from public.tickets t where t.id = new.ticket_id;

  v_preview := case
    when length(btrim(new.body)) > 0 then left(btrim(new.body), 120)
    else 'Sent an attachment: ' || coalesce(new.attachment_name, 'file')
  end;

  if new.sender_role = 'admin' then
    insert into public.notifications (user_id, audience, type, title, message, link)
    values (
      v_owner, 'all', 'info', 'New reply from support',
      format('Re: %s — %s', v_subject, v_preview),
      '/user/tickets/' || new.ticket_id::text
    );
  else
    -- The opening message is covered by the "New support ticket" notice.
    select count(*) into v_count from public.ticket_messages m where m.ticket_id = new.ticket_id;
    if v_count > 1 then
      select coalesce(nullif(p.name, ''), 'A student') into v_name
      from public.profiles p where p.id = new.sender_id;
      insert into public.notifications (user_id, audience, type, title, message, link)
      values (
        null, 'admin', 'info', 'New ticket message',
        format('%s on "%s": %s', coalesce(v_name, 'A student'), v_subject, v_preview),
        '/admin/tickets?id=' || new.ticket_id::text
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_ticket_message on public.ticket_messages;
create trigger trg_notify_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.notify_ticket_message();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-files',
  'ticket-files',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live under <ticket owner id>/<ticket id>/...; admins may write anywhere.
drop policy if exists "ticket_files_insert_own_or_admin" on storage.objects;
create policy "ticket_files_insert_own_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ticket-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "ticket_files_select_own_or_admin" on storage.objects;
create policy "ticket_files_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ticket-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "ticket_files_delete_own_or_admin" on storage.objects;
create policy "ticket_files_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. CRUD permissions and data guards
--    Trusted callers (service role used by the API/webhook/print worker, the SQL
--    editor, admins) may change anything. Students may only do what the app
--    offers them, even when they call Supabase directly from the browser.
-- ---------------------------------------------------------------------------

-- 5a. Price of an order, same rules as src/lib/pricing.ts
create or replace function public.order_amount(
  p_type text,
  p_color text,
  p_pages int,
  p_copies int,
  p_document_pages int,
  p_photo_pages int
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_type = 'photo' then
      pr.photo * greatest(1, coalesce(p_copies, 1))
    when coalesce(p_document_pages, 0) > 0 or coalesce(p_photo_pages, 0) > 0 then
      (case when p_color = 'color' then pr.document_color else pr.document_bw end)
        * greatest(0, coalesce(p_document_pages, 0)) * greatest(1, coalesce(p_copies, 1))
      + pr.photo * greatest(0, coalesce(p_photo_pages, 0)) * greatest(1, coalesce(p_copies, 1))
    else
      (case when p_color = 'color' then pr.document_color else pr.document_bw end)
        * greatest(1, coalesce(p_pages, 1)) * greatest(1, coalesce(p_copies, 1))
  end
  from public.pricing pr
  where pr.id = 1;
$$;

-- 5b. Orders: a student can never set the price or mark an order paid.
--     On insert the price is recalculated and payment fields are reset.
--     On update a student may only replace the file of an unpaid order or
--     cancel an unpaid order that has not started.
create or replace function public.guard_order_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_cols text[] := array['file_name', 'file_path', 'status'];
  v_amount numeric;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_amount := public.order_amount(
      new.type, new.color, new.pages, new.copies, new.document_pages, new.photo_pages
    );
    if v_amount is null then
      raise exception 'Pricing is not configured yet. Ask the shop to set prices first.';
    end if;
    new.amount := v_amount;
    new.status := 'pending';
    new.payment_status := 'pending';
    new.paymongo_link_id := null;
    new.paymongo_checkout_url := null;
    new.created_at := now();
    return new;
  end if;

  if (to_jsonb(new) - v_student_cols) is distinct from (to_jsonb(old) - v_student_cols) then
    raise exception 'Only the print shop can change the price, payment or print details of an order.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not (new.status = 'cancelled' and old.status = 'pending' and old.payment_status <> 'paid') then
    raise exception 'You can only cancel an unpaid order that has not started printing.'
      using errcode = '42501';
  end if;

  if old.payment_status = 'paid'
     and (new.file_path is distinct from old.file_path or new.file_name is distinct from old.file_name) then
    raise exception 'This order is already paid, so its file can''t be changed. Open a support ticket if you need a different file.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_order_write on public.orders;
create trigger trg_guard_order_write
  before insert or update on public.orders
  for each row execute function public.guard_order_write();

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "orders_delete_own_unpaid" on public.orders;
create policy "orders_delete_own_unpaid" on public.orders
  for delete to authenticated
  using (
    user_id = auth.uid()
    and payment_status <> 'paid'
    and status in ('pending', 'cancelled')
  );

-- 5c. Print queue: admins can queue, retry, cancel and delete jobs.
do $$
begin
  if to_regclass('public.print_jobs') is not null then
    drop policy if exists "print_jobs_insert_admin" on public.print_jobs;
    create policy "print_jobs_insert_admin" on public.print_jobs
      for insert to authenticated
      with check (public.is_admin());

    drop policy if exists "print_jobs_update_admin" on public.print_jobs;
    create policy "print_jobs_update_admin" on public.print_jobs
      for update to authenticated
      using (public.is_admin())
      with check (public.is_admin());

    drop policy if exists "print_jobs_delete_admin" on public.print_jobs;
    create policy "print_jobs_delete_admin" on public.print_jobs
      for delete to authenticated
      using (public.is_admin());
  end if;
end $$;

-- 5d. Tickets: students may edit the subject/topic and close or reopen their
--     own ticket, and delete it while staff have not replied. Admins may delete any.
create or replace function public.guard_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status and new.status not in ('open', 'closed') then
    raise exception 'You can close or reopen your ticket. Staff set the other statuses.'
      using errcode = '42501';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'The ticket date can''t be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_ticket_update on public.tickets;
create trigger trg_guard_ticket_update
  before update on public.tickets
  for each row execute function public.guard_ticket_update();

drop policy if exists "tickets_delete_own_unanswered_or_admin" on public.tickets;
create policy "tickets_delete_own_unanswered_or_admin" on public.tickets
  for delete to authenticated
  using (
    public.is_admin()
    or (
      user_id = auth.uid()
      and not exists (
        select 1 from public.ticket_messages m
        where m.ticket_id = tickets.id and m.sender_role = 'admin'
      )
    )
  );

-- 5e. Ticket messages: the sender can edit the text of their own message
--     (marked "edited") and delete it; admins can delete any message.
alter table public.ticket_messages
  add column if not exists edited_at timestamptz;

create or replace function public.guard_ticket_message_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (to_jsonb(new) - array['body', 'edited_at']) is distinct from (to_jsonb(old) - array['body', 'edited_at']) then
    raise exception 'Only the message text can be edited.' using errcode = '42501';
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_ticket_message_update on public.ticket_messages;
create trigger trg_guard_ticket_message_update
  before update on public.ticket_messages
  for each row execute function public.guard_ticket_message_update();

drop policy if exists "ticket_messages_update_own" on public.ticket_messages;
create policy "ticket_messages_update_own" on public.ticket_messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "ticket_messages_delete_own_or_admin" on public.ticket_messages;
create policy "ticket_messages_delete_own_or_admin" on public.ticket_messages
  for delete to authenticated
  using (sender_id = auth.uid() or public.is_admin());

-- 5f. Notifications: admins can edit announcements; everyone can delete
--     their own personal notifications (broadcasts stay admin-only).
drop policy if exists "notifications_update_admin" on public.notifications;
create policy "notifications_update_admin" on public.notifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());
