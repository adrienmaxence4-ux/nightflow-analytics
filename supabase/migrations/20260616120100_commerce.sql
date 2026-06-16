-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Migration 002 : Commerce
-- Boutiques, produits, commandes, campagnes, métriques quotidiennes.
-- Idempotent & non destructif.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- Enums (créés via DO pour rester idempotents)
-- ───────────────────────────────────────────────
do $$ begin
  create type public.trend_dir as enum ('up', 'down');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.campaign_status as enum ('active', 'paused', 'ended');
exception when duplicate_object then null; end $$;

-- ───────────────────────────────────────────────
-- Table : stores
-- ───────────────────────────────────────────────
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text,
  platform    text not null default 'shopify',
  currency    text not null default 'EUR',
  timezone    text not null default 'Europe/Paris',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_stores_owner on public.stores(owner_id);

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

alter table public.stores enable row level security;

drop policy if exists "stores_owner_all" on public.stores;
create policy "stores_owner_all"
  on public.stores for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Helper : l'utilisateur courant possède-t-il cette boutique ?
create or replace function public.owns_store(p_store uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store and s.owner_id = auth.uid()
  );
$$;

-- ───────────────────────────────────────────────
-- Table : products
-- ───────────────────────────────────────────────
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  external_id   text,
  name          text not null,
  icon          text default '📦',
  price_cents   integer not null default 0 check (price_cents >= 0),
  stock         integer not null default 0 check (stock >= 0),
  conversion    numeric(5,2) not null default 0,
  trend         public.trend_dir not null default 'up',
  delta         text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (store_id, external_id)
);
create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_stock on public.products(store_id, stock);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "products_store_owner" on public.products;
create policy "products_store_owner"
  on public.products for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- Table : orders
-- ───────────────────────────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  external_id     text,
  customer_email  text,
  total_cents     integer not null default 0 check (total_cents >= 0),
  currency        text not null default 'EUR',
  status          text not null default 'paid',
  channel         text,
  placed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (store_id, external_id)
);
create index if not exists idx_orders_store_date on public.orders(store_id, placed_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_store_owner" on public.orders;
create policy "orders_store_owner"
  on public.orders for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- Table : order_items
-- ───────────────────────────────────────────────
create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  quantity        integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0)
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items_owner" on public.order_items;
create policy "order_items_owner"
  on public.order_items for all
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and public.owns_store(o.store_id)
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and public.owns_store(o.store_id)
  ));

-- ───────────────────────────────────────────────
-- Table : campaigns (marketing)
-- ───────────────────────────────────────────────
create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  channel       text not null,
  status        public.campaign_status not null default 'active',
  spend_cents   integer not null default 0 check (spend_cents >= 0),
  revenue_cents integer not null default 0 check (revenue_cents >= 0),
  roas          numeric(6,2) generated always as (
                  case when spend_cents = 0 then 0
                  else round(revenue_cents::numeric / spend_cents, 2) end
                ) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_campaigns_store on public.campaigns(store_id);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_store_owner" on public.campaigns;
create policy "campaigns_store_owner"
  on public.campaigns for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- ───────────────────────────────────────────────
-- Table : metrics_daily (séries temporelles KPI)
-- ───────────────────────────────────────────────
create table if not exists public.metrics_daily (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  date          date not null,
  revenue_cents integer not null default 0,
  orders        integer not null default 0,
  visitors      integer not null default 0,
  conversion    numeric(5,2) not null default 0,
  created_at    timestamptz not null default now(),
  unique (store_id, date)
);
create index if not exists idx_metrics_store_date on public.metrics_daily(store_id, date desc);

alter table public.metrics_daily enable row level security;

drop policy if exists "metrics_store_owner" on public.metrics_daily;
create policy "metrics_store_owner"
  on public.metrics_daily for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));
