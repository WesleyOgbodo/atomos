-- Atomos Backend — Section 2.1
-- PostgreSQL/Supabase schema
-- Run this migration in a fresh Atomos Supabase project.

create extension if not exists pgcrypto;

create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.listing_condition as enum ('brand_new', 'used');
create type public.listing_status as enum ('draft', 'active', 'sold', 'archived', 'removed');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered', 'cancelled');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  phone text,
  avatar_url text,
  role public.user_role not null default 'buyer',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  brand_id uuid references public.brands(id),
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null default '' check (char_length(description) <= 5000),
  price numeric(12,2) not null check (price >= 0),
  condition public.listing_condition not null,
  location text not null check (char_length(trim(location)) between 2 and 120),
  stock integer not null default 1 check (stock between 0 and 999),
  status public.listing_status not null default 'draft',
  specs jsonb not null default '{}'::jsonb,
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (listing_id, storage_path)
);

create table public.wishlists (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, listing_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) generated always as (subtotal + delivery_fee) stored,
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  title_snapshot text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  status public.report_status not null default 'open',
  moderator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index listings_seller_idx on public.listings(seller_id);
create index listings_category_idx on public.listings(category_id);
create index listings_brand_idx on public.listings(brand_id);
create index listings_status_created_idx on public.listings(status, created_at desc);
create index listings_price_idx on public.listings(price);
create index listings_location_idx on public.listings(location);
create index listing_photos_listing_idx on public.listing_photos(listing_id, sort_order);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index reports_status_created_idx on public.reports(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings
for each row execute function public.set_updated_at();
create trigger carts_updated_at before update on public.carts
for each row execute function public.set_updated_at();
create trigger cart_items_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.wishlists enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- Public catalogue metadata.
create policy categories_public_read on public.categories for select using (true);
create policy brands_public_read on public.brands for select using (true);
create policy active_listings_public_read on public.listings
for select using (status = 'active' or seller_id = auth.uid());
create policy listing_photos_public_read on public.listing_photos
for select using (exists (
  select 1 from public.listings l
  where l.id = listing_photos.listing_id
    and (l.status = 'active' or l.seller_id = auth.uid())
));

-- Profiles: users can read/update their own profile.
create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Listings: seller owns mutations.
create policy listings_seller_insert on public.listings
for insert with check (seller_id = auth.uid());
create policy listings_seller_update on public.listings
for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy listings_seller_delete on public.listings
for delete using (seller_id = auth.uid());

create policy listing_photos_seller_insert on public.listing_photos
for insert with check (exists (
  select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
));
create policy listing_photos_seller_update on public.listing_photos
for update using (exists (
  select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
));
create policy listing_photos_seller_delete on public.listing_photos
for delete using (exists (
  select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
));

-- Wishlist.
create policy wishlist_self_all on public.wishlists
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cart.
create policy carts_self_all on public.carts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_self_all on public.cart_items
for all using (exists (
  select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
)) with check (exists (
  select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
));

-- Conversation participants can access their conversations.
create policy conversation_participants_self_read on public.conversation_participants
for select using (user_id = auth.uid());
create policy conversation_participants_self_insert on public.conversation_participants
for insert with check (user_id = auth.uid());

create policy conversations_participant_read on public.conversations
for select using (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
));
create policy conversations_participant_insert on public.conversations
for insert with check (auth.uid() is not null);

create policy messages_participant_read on public.messages
for select using (exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
));
create policy messages_participant_insert on public.messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  )
);
create policy messages_sender_update on public.messages
for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- Orders: buyers see their own; sellers see orders containing their listings.
create policy orders_buyer_read on public.orders
for select using (buyer_id = auth.uid());
create policy orders_buyer_insert on public.orders
for insert with check (buyer_id = auth.uid());
create policy orders_buyer_update on public.orders
for update using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

create policy order_items_buyer_read on public.order_items
for select using (exists (
  select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = auth.uid()
));
create policy order_items_seller_read on public.order_items
for select using (seller_id = auth.uid());
create policy order_items_buyer_insert on public.order_items
for insert with check (exists (
  select 1 from public.orders o where o.id = order_items.order_id and o.buyer_id = auth.uid()
));

-- Reviews: authenticated buyers may create reviews only for their own order items.
create policy reviews_public_read on public.reviews for select using (true);
create policy reviews_buyer_insert on public.reviews
for insert with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = reviews.order_item_id and o.buyer_id = auth.uid()
  )
);
create policy reviews_buyer_update on public.reviews
for update using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
create policy reviews_buyer_delete on public.reviews
for delete using (buyer_id = auth.uid());

-- Reports: reporters can create/read their own reports. Moderation access will be added through admin-only server functions.
create policy reports_self_read on public.reports for select using (reporter_id = auth.uid());
create policy reports_self_insert on public.reports
for insert with check (reporter_id = auth.uid());

-- Notifications are private to their owner.
create policy notifications_self_read on public.notifications
for select using (user_id = auth.uid());
create policy notifications_self_update on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Initial marketplace metadata.
insert into public.categories (name, slug) values
  ('Phones', 'phones'),
  ('Laptops', 'laptops'),
  ('Audio', 'audio'),
  ('Accessories', 'accessories'),
  ('Fashion', 'fashion'),
  ('Shoes', 'shoes'),
  ('Other', 'other')
on conflict (slug) do nothing;

insert into public.brands (name, slug) values
  ('Apple', 'apple'),
  ('Samsung', 'samsung'),
  ('Xiaomi', 'xiaomi'),
  ('Infinix', 'infinix'),
  ('Oppo', 'oppo')
on conflict (slug) do nothing;
