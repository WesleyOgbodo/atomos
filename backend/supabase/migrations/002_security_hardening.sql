-- Atomos Backend — Section 2.2 security hardening
-- Run AFTER 001_initial_schema.sql in the existing Atomos Supabase project.

-- 1) Profiles: clients must not be able to change role/suspension state.
-- Profile edits will go through this narrow RPC instead.
drop policy if exists profiles_self_update on public.profiles;

create or replace function public.update_my_profile(
  p_full_name text default null,
  p_username text default null,
  p_phone text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set full_name = p_full_name,
      username = nullif(trim(p_username), ''),
      phone = p_phone,
      avatar_url = p_avatar_url
  where id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Profile not found';
  end if;

  return result;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;

-- 2) Listing mutations: suspended sellers cannot create or mutate listings.
drop policy if exists listings_seller_insert on public.listings;
drop policy if exists listings_seller_update on public.listings;

create policy listings_seller_insert on public.listings
for insert with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

create policy listings_seller_update on public.listings
for update using (
  seller_id = auth.uid()
) with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

-- 3) Conversations: creation must be atomic and tied to a real listing seller.
drop policy if exists conversations_participant_insert on public.conversations;
drop policy if exists conversation_participants_self_insert on public.conversation_participants;

create or replace function public.create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_conversation uuid;
begin
  if v_buyer is null then
    raise exception 'Authentication required';
  end if;

  select seller_id into v_seller
  from public.listings
  where id = p_listing_id
    and status = 'active';

  if v_seller is null then
    raise exception 'Listing is not available';
  end if;

  if v_seller = v_buyer then
    raise exception 'Sellers cannot start a buyer conversation with themselves';
  end if;

  select c.id into v_conversation
  from public.conversations c
  join public.conversation_participants cp1
    on cp1.conversation_id = c.id and cp1.user_id = v_buyer
  join public.conversation_participants cp2
    on cp2.conversation_id = c.id and cp2.user_id = v_seller
  where c.listing_id = p_listing_id
  limit 1;

  if v_conversation is not null then
    return v_conversation;
  end if;

  insert into public.conversations (listing_id)
  values (p_listing_id)
  returning id into v_conversation;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation, v_buyer), (v_conversation, v_seller);

  return v_conversation;
end;
$$;

revoke all on function public.create_conversation(uuid) from public, anon;
grant execute on function public.create_conversation(uuid) to authenticated;

-- 4) Orders: clients cannot directly choose prices, sellers, totals, or status.
-- Checkout will use this transaction-safe RPC.
drop policy if exists orders_buyer_insert on public.orders;
drop policy if exists orders_buyer_update on public.orders;
drop policy if exists order_items_buyer_insert on public.order_items;

create or replace function public.create_order(
  p_items jsonb,
  p_delivery_address text default null,
  p_delivery_fee numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_order uuid;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_listing public.listings;
  v_quantity integer;
begin
  if v_buyer is null then
    raise exception 'Authentication required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if p_delivery_fee is null or p_delivery_fee < 0 then
    raise exception 'Invalid delivery fee';
  end if;

  insert into public.orders (buyer_id, status, subtotal, delivery_fee, delivery_address)
  values (v_buyer, 'pending', 0, p_delivery_fee, nullif(trim(p_delivery_address), ''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if not (v_item ? 'listing_id') or not (v_item ? 'quantity') then
      raise exception 'Each order item requires listing_id and quantity';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Invalid item quantity';
    end if;

    select * into v_listing
    from public.listings
    where id = (v_item ->> 'listing_id')::uuid
    for update;

    if not found or v_listing.status <> 'active' then
      raise exception 'A listing in this order is no longer available';
    end if;

    if v_listing.stock < v_quantity then
      raise exception 'Insufficient stock for listing %', v_listing.id;
    end if;

    v_subtotal := v_subtotal + (v_listing.price * v_quantity);

    insert into public.order_items (
      order_id, listing_id, seller_id, title_snapshot, unit_price, quantity
    ) values (
      v_order, v_listing.id, v_listing.seller_id, v_listing.title, v_listing.price, v_quantity
    );

    update public.listings
    set stock = stock - v_quantity,
        status = case when stock - v_quantity = 0 then 'sold' else status end
    where id = v_listing.id;
  end loop;

  update public.orders
  set subtotal = v_subtotal
  where id = v_order;

  return v_order;
exception
  when others then
    -- The exception rolls the whole transaction back, including stock changes.
    raise;
end;
$$;

revoke all on function public.create_order(jsonb, text, numeric) from public, anon;
grant execute on function public.create_order(jsonb, text, numeric) to authenticated;

-- 5) Reviews: buyer must reference the exact purchased listing/seller.
drop policy if exists reviews_buyer_insert on public.reviews;
create policy reviews_buyer_insert on public.reviews
for insert with check (
  buyer_id = auth.uid()
  and exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = reviews.order_item_id
      and o.buyer_id = auth.uid()
      and oi.seller_id = reviews.seller_id
      and oi.listing_id = reviews.listing_id
  )
);

-- 6) Listing view count: clients cannot directly overwrite the counter.
-- Publicly callable function increments by exactly one.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'active'
  returning view_count;
$$;

revoke all on function public.increment_listing_view(uuid) from public, anon;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;

-- 7) Storage bucket for listing photos.
-- The bucket is private; the client will use signed URLs later.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false)
on conflict (id) do update set public = false;

-- Paths are stored as: <listing_uuid>/<filename>
drop policy if exists listing_photos_storage_insert on storage.objects;
drop policy if exists listing_photos_storage_update on storage.objects;
drop policy if exists listing_photos_storage_delete on storage.objects;
drop policy if exists listing_photos_storage_read on storage.objects;

create policy listing_photos_storage_read on storage.objects
for select using (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 1)
      and (l.status = 'active' or l.seller_id = auth.uid())
  )
);

create policy listing_photos_storage_insert on storage.objects
for insert with check (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    where l.id::text = split_part(name, '/', 1)
      and l.seller_id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

create policy listing_photos_storage_update on storage.objects
for update using (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 1)
      and l.seller_id = auth.uid()
  )
) with check (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 1)
      and l.seller_id = auth.uid()
  )
);

create policy listing_photos_storage_delete on storage.objects
for delete using (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.listings l
    where l.id::text = split_part(name, '/', 1)
      and l.seller_id = auth.uid()
  )
);

-- 8) Helpful uniqueness constraint: one review per purchased order item already exists.
-- Keep admin role/suspension changes outside client-facing RLS/RPCs.
