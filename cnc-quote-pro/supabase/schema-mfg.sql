-- ============================================================
-- FEEDRATE — İstehsal marketplace sxemi (Faza 1)
-- Supabase → SQL Editor (schema.sql-dan SONRA işlət)
-- suppliers · mfg_orders · order_events · supplier_bonuses
-- + escrow, supplier-direct portal token, attribution (marketplace/direct/overflow)
-- ============================================================

-- ---------- SUPPLIERS (emalatxana şəbəkəsi) ----------
create table if not exists public.suppliers (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.profiles(id) on delete set null, -- supplier-in hesabı
  name             text not null,
  voen             text,                       -- vergi nömrəsi (tax id)
  contact_email    text,
  contact_phone    text,
  capabilities     text[] default '{}',        -- {cnc-milling,cnc-turning,laser,plasma,3d-print,sheet-metal}
  materials        text[] default '{}',        -- {aluminum,steel,acrylic,abs,pla,...}
  location         text,
  monthly_capacity int,                          -- aylıq təxmini sifariş tutumu
  lead_time_days   int default 7,
  status           text not null default 'pending' check (status in ('pending','active','suspended')),
  rating           numeric(3,2) not null default 0,   -- 0.00–5.00
  orders_completed int  not null default 0,
  payout_method    text check (payout_method in ('stripe_connect','payoneer','wise','manual')),
  payout_ref       text,                          -- connected account / token (gizli detal serverdə)
  direct_token     text unique,                   -- supplier-direct portal üçün unikal token
  activation_bonus_paid boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.suppliers enable row level security;
create policy "suppliers public read active"
  on public.suppliers for select using (status = 'active' or auth.uid() = owner_id);
create policy "suppliers owner update"
  on public.suppliers for update using (auth.uid() = owner_id);
create index if not exists suppliers_status_idx on public.suppliers(status);
create index if not exists suppliers_token_idx  on public.suppliers(direct_token);

-- ---------- MANUFACTURING ORDERS (qiymət → sifariş → istehsal → çatdırılma) ----------
create table if not exists public.mfg_orders (
  id                   uuid primary key default gen_random_uuid(),
  ref                  text unique,                  -- insan-oxunaqlı: FR-2026-000123
  customer_id          uuid references public.profiles(id) on delete set null, -- anon/direct üçün null ola bilər
  customer_email       text,
  supplier_id          uuid references public.suppliers(id) on delete set null,
  source               text not null default 'marketplace'
                          check (source in ('marketplace','direct','overflow')),  -- atribusiya
  quote                jsonb not null default '{}'::jsonb,   -- qiymət snapshot-u (material/ölçü/proses/qiymət)
  amount_cents         int  not null,                 -- müştərinin ödədiyi tam məbləğ (GMV)
  supplier_payout_cents int not null default 0,        -- supplier-ə gedən
  commission_cents     int  not null default 0,        -- bizim pay (direct-də 0)
  commission_rate      numeric(4,3) not null default 0, -- 0.200 marketplace · 0 direct
  currency             text not null default 'USD',
  status               text not null default 'quote'
     check (status in ('quote','ordered','paid','routed','in_production','quality','shipped','delivered','completed','cancelled','refunded')),
  escrow_status        text not null default 'held'
     check (escrow_status in ('none','held','released','refunded')),
  payment_ref          text,                          -- Stripe payment intent id
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.mfg_orders enable row level security;
-- müştəri öz sifarişini, supplier ona yönləndirilmiş sifarişi görür
create policy "mfg_orders party read" on public.mfg_orders for select using (
  auth.uid() = customer_id
  or auth.uid() = (select owner_id from public.suppliers s where s.id = supplier_id)
);
-- yazılar serverdə (service role) baş verir — escrow/ödəniş təhlükəsizliyi
create index if not exists mfg_orders_customer_idx on public.mfg_orders(customer_id);
create index if not exists mfg_orders_supplier_idx on public.mfg_orders(supplier_id);
create index if not exists mfg_orders_status_idx   on public.mfg_orders(status);

-- ---------- ORDER EVENTS (status tarixçəsi / izləmə) ----------
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.mfg_orders(id) on delete cascade,
  status      text not null,
  note        text,
  actor       text,                              -- 'system' | 'customer' | 'supplier' | 'admin'
  created_at  timestamptz not null default now()
);
alter table public.order_events enable row level security;
create policy "order_events party read" on public.order_events for select using (
  order_id in (select id from public.mfg_orders)   -- mfg_orders RLS onsuz da filtrləyir
);

-- ---------- SUPPLIER BONUSES (birdəfəlik aktivləşmə bonusu) ----------
create table if not exists public.supplier_bonuses (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  amount_cents  int  not null,
  reason        text default '10 keyfiyyətli sifariş (≥$150)',
  created_at    timestamptz not null default now(),
  unique (supplier_id)                            -- bir supplier-ə yalnız bir dəfə
);
alter table public.supplier_bonuses enable row level security; -- service role only

-- ---------- updated_at avtomatik yeniləmə ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

drop trigger if exists mfg_orders_touch on public.mfg_orders;
create trigger mfg_orders_touch before update on public.mfg_orders
  for each row execute function public.touch_updated_at();

-- ---------- helper: sifariş ref nömrəsi ----------
create sequence if not exists public.mfg_order_seq;
create or replace function public.next_order_ref()
returns text language plpgsql as $$
begin
  return 'FR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.mfg_order_seq')::text, 6, '0');
end; $$;
