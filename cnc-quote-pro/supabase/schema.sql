-- ============================================================
-- FEEDRATE — Supabase schema (run in Supabase → SQL Editor)
-- Faza 1: profiles, usage limits, IP registry, models, designs, marketplace
-- ============================================================

-- ---------- PROFILES (extends auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user','admin')),
  plan        text not null default 'free' check (plan in ('free','starter','pro','business')),
  signup_ip   text,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles self read"  on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- USAGE (monthly counters per user) ----------
create table if not exists public.usage_monthly (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  period      text not null,                 -- 'YYYY-MM'
  calc_count  int  not null default 0,
  dl_count    int  not null default 0,
  unique (user_id, period)
);
alter table public.usage_monthly enable row level security;
create policy "usage self read" on public.usage_monthly for select using (auth.uid() = user_id);
-- writes happen via service role (server) only

-- ---------- ANON USAGE (1 free quote, no account) ----------
create table if not exists public.anon_usage (
  id          uuid primary key default gen_random_uuid(),
  fingerprint text not null,                 -- ip + cookie hash
  calc_count  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (fingerprint)
);
alter table public.anon_usage enable row level security; -- service role only

-- ---------- IP REGISTRY (1 IP = 1 account) ----------
create table if not exists public.ip_registry (
  ip          text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.ip_registry enable row level security; -- service role only

-- ---------- MODELS (library) ----------
create table if not exists public.models (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  file_path   text,           -- storage path (STEP/STL/GLTF)
  thumb_path  text,
  params      jsonb default '{}'::jsonb,
  license     text default 'CC0',
  owner_id    uuid references public.profiles(id) on delete set null,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.models enable row level security;
create policy "models public read" on public.models for select using (is_public = true or auth.uid() = owner_id);

-- ---------- DESIGNS (user-created in browser CAD) ----------
create table if not exists public.designs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Untitled',
  history     jsonb default '[]'::jsonb,      -- CAD feature tree
  thumb_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.designs enable row level security;
create policy "designs owner all" on public.designs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------- LISTINGS (marketplace) ----------
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  design_id   uuid references public.designs(id) on delete set null,
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  price_cents int  not null check (price_cents >= 0),
  license     text default 'personal',
  status      text not null default 'draft' check (status in ('draft','active','removed')),
  created_at  timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "listings public read" on public.listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "listings owner write" on public.listings for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- ---------- ORDERS (marketplace purchases) ----------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid references public.listings(id) on delete set null,
  buyer_id       uuid references public.profiles(id) on delete set null,
  amount_cents   int not null,
  commission_cents int not null default 0,
  status         text not null default 'pending' check (status in ('pending','paid','refunded')),
  created_at     timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "orders party read" on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = (select seller_id from public.listings l where l.id = listing_id));

-- ---------- helper: bump monthly usage atomically (service role) ----------
create or replace function public.bump_usage(p_user uuid, p_kind text)
returns int language plpgsql security definer set search_path = public as $$
declare v_period text := to_char(now(), 'YYYY-MM'); v_count int;
begin
  insert into public.usage_monthly (user_id, period) values (p_user, v_period)
  on conflict (user_id, period) do nothing;
  if p_kind = 'calc' then
    update public.usage_monthly set calc_count = calc_count + 1
      where user_id = p_user and period = v_period returning calc_count into v_count;
  else
    update public.usage_monthly set dl_count = dl_count + 1
      where user_id = p_user and period = v_period returning dl_count into v_count;
  end if;
  return v_count;
end; $$;
