-- Surprise évent & haid — schéma principal
-- Les montants sont stockés en FCFA (entiers, pas de décimales).

create extension if not exists pgcrypto;

-- ───────────────────────────── Types ─────────────────────────────
create type public.user_role      as enum ('customer', 'admin');
create type public.city           as enum ('yaounde', 'douala');
create type public.stock_status   as enum ('available', 'limited', 'out_of_stock');
create type public.price_mode     as enum ('fixed', 'from', 'custom_amount');
create type public.discount_type  as enum ('percent', 'fixed');
create type public.order_status   as enum ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('mtn_momo', 'orange_money', 'card', 'deposit_cod', 'cash_on_delivery');

-- ───────────────────────────── Utilitaires ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────────── Profils ─────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────────────────────────── Catalogue ─────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  emoji       text,
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.categories (id) on delete set null,
  slug             text not null unique,
  name             text not null,
  tagline          text,
  description      text,
  price_mode       public.price_mode not null default 'fixed',
  base_price       int not null check (base_price >= 0),
  compare_at_price int check (compare_at_price is null or compare_at_price > base_price),
  images           text[] not null default '{}',
  badge            text,
  composition      text[] not null default '{}',
  is_pack          boolean not null default false,
  stock            public.stock_status not null default 'available',
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx   on public.products (is_active, sort_order);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Formules (ex. Standard / Prestige / Royal Luxe) : remplacent le prix de base si présentes.
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  name           text not null,
  description    text,
  price          int not null check (price >= 0),
  is_recommended boolean not null default false,
  sort_order     int not null default 0
);
create index product_variants_product_idx on public.product_variants (product_id);

-- Options complémentaires (saxophoniste, chanteur, hôtesse…).
create table public.addons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  emoji       text,
  price       int not null check (price >= 0),
  is_active   boolean not null default true,
  sort_order  int not null default 0
);

create table public.product_addons (
  product_id uuid not null references public.products (id) on delete cascade,
  addon_id   uuid not null references public.addons (id) on delete cascade,
  primary key (product_id, addon_id)
);

-- ───────────────────────────── Livraison, promos, réglages ─────────────────────────────
create table public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  city       public.city not null,
  district   text not null,
  fee        int not null check (fee >= 0),
  is_other   boolean not null default false, -- « Autres quartiers »
  is_active  boolean not null default true,
  sort_order int not null default 0,
  unique (city, district)
);

create table public.promotions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null,
  type        public.discount_type not null,
  value       int not null check (value > 0),
  min_order   int not null default 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (type <> 'percent' or value <= 100)
);

create table public.settings (
  key   text primary key,
  value jsonb not null
);

-- ───────────────────────────── Commandes ─────────────────────────────
create table public.order_counters (
  year int primary key,
  last int not null default 0
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,
  access_token     uuid not null default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete set null,

  customer_name     text not null,
  customer_phone    text not null,
  customer_whatsapp text,
  customer_email    text,
  anonymous_sender  boolean not null default false,

  recipient_name  text not null,
  recipient_phone text not null,
  city            public.city not null,
  district        text not null,
  address         text not null,
  delivery_date   date not null,
  delivery_slot   text,
  is_express      boolean not null default false,
  instructions    text,

  subtotal     int not null,
  delivery_fee int not null,
  express_fee  int not null default 0,
  discount     int not null default 0,
  total        int not null,
  deposit_due  int not null default 0, -- montant à régler à la commande
  promo_code   text,

  status         public.order_status   not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx   on public.orders (status, created_at desc);
create index orders_created_idx  on public.orders (created_at desc);
create index orders_user_idx     on public.orders (user_id);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  variant_name  text,
  unit_price    int not null,
  quantity      int not null check (quantity between 1 and 20),
  customization jsonb not null default '{}'::jsonb,
  addons        jsonb not null default '[]'::jsonb,
  line_total    int not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  note       text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  method       public.payment_method not null,
  amount       int not null,
  status       public.payment_status not null default 'pending',
  provider     text,
  provider_ref text,
  raw          jsonb,
  created_at   timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null check (char_length(first_name) between 1 and 60),
  city        text,
  rating      int not null check (rating between 1 and 5),
  comment     text not null check (char_length(comment) between 5 and 600),
  product_id  uuid references public.products (id) on delete set null,
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);
