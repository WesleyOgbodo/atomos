-- Atomos Section 2.4.1 — Supabase-backed cart
-- Run after the existing Atomos schema/migrations.

create or replace function public.get_or_create_my_cart()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cart_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into cart_id
  from public.carts
  where user_id = auth.uid();

  if cart_id is null then
    insert into public.carts (user_id)
    values (auth.uid())
    returning id into cart_id;
  end if;

  return cart_id;
end;
$$;

revoke all on function public.get_or_create_my_cart() from public;
grant execute on function public.get_or_create_my_cart() to authenticated;

create or replace function public.add_to_my_cart(
  p_listing_id uuid,
  p_quantity integer default 1
)
returns table (
  listing_id uuid,
  quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cart_id uuid;
  current_quantity integer;
  available_stock integer;
  listing_status public.listing_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception 'Quantity must be between 1 and 99';
  end if;

  select l.stock, l.status
  into available_stock, listing_status
  from public.listings l
  where l.id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;

  if listing_status <> 'active' then
    raise exception 'This listing is no longer available';
  end if;

  if available_stock < 1 then
    raise exception 'This listing is out of stock';
  end if;

  cart_id := public.get_or_create_my_cart();

  select ci.quantity into current_quantity
  from public.cart_items ci
  where ci.cart_id = cart_id and ci.listing_id = p_listing_id;

  current_quantity := coalesce(current_quantity, 0) + p_quantity;

  if current_quantity > least(99, available_stock) then
    raise exception 'Only % item(s) are available', least(99, available_stock);
  end if;

  insert into public.cart_items (cart_id, listing_id, quantity)
  values (cart_id, p_listing_id, current_quantity)
  on conflict (cart_id, listing_id)
  do update set quantity = excluded.quantity, updated_at = now();

  update public.carts set updated_at = now() where id = cart_id;

  return query select p_listing_id, current_quantity;
end;
$$;

revoke all on function public.add_to_my_cart(uuid, integer) from public;
grant execute on function public.add_to_my_cart(uuid, integer) to authenticated;

create or replace function public.set_my_cart_quantity(
  p_listing_id uuid,
  p_quantity integer
)
returns table (
  listing_id uuid,
  quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cart_id uuid;
  available_stock integer;
  listing_status public.listing_status;
  next_quantity integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception 'Quantity must be between 1 and 99';
  end if;

  cart_id := public.get_or_create_my_cart();

  select l.stock, l.status
  into available_stock, listing_status
  from public.listings l
  where l.id = p_listing_id;

  if not found or listing_status <> 'active' or available_stock < 1 then
    raise exception 'This listing is no longer available';
  end if;

  next_quantity := least(p_quantity, available_stock, 99);

  update public.cart_items
  set quantity = next_quantity, updated_at = now()
  where cart_items.cart_id = cart_id
    and cart_items.listing_id = p_listing_id;

  if not found then
    raise exception 'Cart item not found';
  end if;

  update public.carts set updated_at = now() where id = cart_id;

  return query select p_listing_id, next_quantity;
end;
$$;

revoke all on function public.set_my_cart_quantity(uuid, integer) from public;
grant execute on function public.set_my_cart_quantity(uuid, integer) to authenticated;

create or replace function public.remove_from_my_cart(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into v_cart_id from public.carts where user_id = auth.uid();
  if v_cart_id is null then return; end if;

  delete from public.cart_items ci
  where ci.cart_id = v_cart_id and ci.listing_id = p_listing_id;

  update public.carts set updated_at = now() where id = v_cart_id;
end;
$$;

revoke all on function public.remove_from_my_cart(uuid) from public;
grant execute on function public.remove_from_my_cart(uuid) to authenticated;

create or replace function public.clear_my_cart()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into v_cart_id from public.carts where user_id = auth.uid();
  if v_cart_id is null then return; end if;

  delete from public.cart_items ci where ci.cart_id = v_cart_id;
  update public.carts set updated_at = now() where id = v_cart_id;
end;
$$;

revoke all on function public.clear_my_cart() from public;
grant execute on function public.clear_my_cart() to authenticated;

create or replace function public.get_my_cart()
returns table (
  listing_id uuid,
  quantity integer,
  title text,
  price numeric,
  condition public.listing_condition,
  location text,
  stock integer,
  status public.listing_status,
  photo_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    ci.listing_id,
    ci.quantity,
    l.title,
    l.price,
    l.condition,
    l.location,
    l.stock,
    l.status,
    (
      select lp.storage_path
      from public.listing_photos lp
      where lp.listing_id = l.id
      order by lp.sort_order, lp.created_at
      limit 1
    ) as photo_path
  from public.carts c
  join public.cart_items ci on ci.cart_id = c.id
  join public.listings l on l.id = ci.listing_id
  where c.user_id = auth.uid()
  order by ci.created_at desc;
$$;

revoke all on function public.get_my_cart() from public;
grant execute on function public.get_my_cart() to authenticated;

-- Do not allow direct client writes to bypass the validation functions.
drop policy if exists cart_items_self_insert on public.cart_items;
drop policy if exists cart_items_self_update on public.cart_items;
drop policy if exists cart_items_self_delete on public.cart_items;

-- Keep direct SELECT available for the owner's cart, but route mutations through RPCs.
drop policy if exists cart_items_self_all on public.cart_items;
create policy cart_items_self_read on public.cart_items
for select using (exists (
  select 1 from public.carts c
  where c.id = cart_items.cart_id and c.user_id = auth.uid()
));

-- The SECURITY DEFINER functions perform their own ownership checks.
