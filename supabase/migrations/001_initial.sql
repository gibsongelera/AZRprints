-- AZR PRINT'S initial schema: profiles, pricing, shop_settings, orders, notifications + RLS + storage

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  name text not null default '',
  student_id text,
  college text,
  department text,
  phone text,
  created_at timestamptz not null default now()
);

-- Pricing singleton
create table if not exists public.pricing (
  id int primary key default 1 check (id = 1),
  document_bw numeric(10,2) not null default 2.00,
  document_color numeric(10,2) not null default 5.00,
  photo numeric(10,2) not null default 10.00,
  large_format numeric(10,2) not null default 50.00,
  binding numeric(10,2) not null default 25.00,
  updated_at timestamptz not null default now()
);

-- Shop settings singleton
create table if not exists public.shop_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'AZR PRINT''S',
  tagline text not null default 'ZPPSU Printing Services',
  open_time text not null default '07:00',
  close_time text not null default '18:00',
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  file_path text,
  pages int not null default 1 check (pages >= 1),
  type text not null check (type in ('document', 'photo', 'large')),
  color text not null default 'bw' check (color in ('bw', 'color')),
  copies int not null default 1 check (copies >= 1),
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  paymongo_link_id text,
  paymongo_checkout_url text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_paymongo_link_id_idx on public.orders (paymongo_link_id);

-- Notifications
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, student_id, college, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed singletons
insert into public.pricing (id, document_bw, document_color, photo, large_format, binding)
values (1, 2.00, 5.00, 10.00, 50.00, 25.00)
on conflict (id) do nothing;

insert into public.shop_settings (id, shop_name, tagline, open_time, close_time)
values (1, 'AZR PRINT''S', 'ZPPSU Printing Services', '07:00', '18:00')
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.pricing enable row level security;
alter table public.shop_settings enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Pricing
drop policy if exists "pricing_select_auth" on public.pricing;
create policy "pricing_select_auth" on public.pricing
  for select to authenticated
  using (true);

drop policy if exists "pricing_update_admin" on public.pricing;
create policy "pricing_update_admin" on public.pricing
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Shop settings
drop policy if exists "shop_settings_select_auth" on public.shop_settings;
create policy "shop_settings_select_auth" on public.shop_settings
  for select to authenticated
  using (true);

drop policy if exists "shop_settings_update_admin" on public.shop_settings;
create policy "shop_settings_update_admin" on public.shop_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Orders
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own" on public.orders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Notifications
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or user_id is null or public.is_admin());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert to authenticated
  with check (public.is_admin());

-- Storage bucket for order files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-files',
  'order-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do nothing;

drop policy if exists "order_files_upload_own" on storage.objects;
create policy "order_files_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "order_files_select_own_or_admin" on storage.objects;
create policy "order_files_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "order_files_delete_own_or_admin" on storage.objects;
create policy "order_files_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'order-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
