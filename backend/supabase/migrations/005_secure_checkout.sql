-- Atomos Section 2.4.2 — Secure checkout from the authenticated buyer's cart.
-- Run after 004_cart.sql.

alter table public.orders
  add column if not exists delivery_method text not null default 'pickup';

alter table public.orders
  drop constraint if exists orders_delivery_method_check;

alter table public.orders
  add constraint orders_delivery_method_check
  check (delivery_method in ('pickup', 'delivery'));

-- The previous create_order RPC accepted arbitrary client-supplied items/prices.
-- Checkout now derives every item and price from the buyer's persisted cart.
revoke all on function public.create_order(jsonb, text, numeric) from public, anon, authenticated;
drop function if exists public.create_order(jsonb, text, numeric);

create or replace function public.create_order_from_cart(
  p_delivery_method text,
  p_delivery_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_cart_id uuid;
  v_order uuid;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2) := 0;
  v_item record;
  v_listing public.listings;
  v_address text := nullif(trim(coalesce(p_delivery_address, '')), '');
begin
  if v_buyer is null then
    raise exception 'Authentication required';
  end if;

  if lower(trim(coalesce(p_delivery_method, ''))) not in ('pickup', 'delivery') then
    raise exception 'Invalid delivery method';
  end if;

  if lower(trim(p_delivery_method)) = 'delivery' then
    if v_address is null or char_length(v_address) < 5 then
      raise exception 'A delivery address is required';
    end if;
    -- Flat initial delivery fee. This is server-controlled and can be replaced
    -- later with a location-based pricing service without trusting the client.
    v_delivery_fee := 2000;
  else
    v_address := null;
  end if;

  select c.id
    into v_cart_id
  from public.carts c
  where c.user_id = v_buyer
  for update;

  if v_cart_id is null then
    raise exception 'Your cart is empty';
  end if;

  if not exists (select 1 from public.cart_items ci where ci.cart_id = v_cart_id) then
    raise exception 'Your cart is empty';
  end if;

  insert into public.orders (
    buyer_id, status, subtotal, delivery_fee, delivery_method, delivery_address
  )
  values (
    v_buyer, 'pending', 0, v_delivery_fee, lower(trim(p_delivery_method)), v_address
  )
  returning id into v_order;

  for v_item in
    select ci.listing_id, ci.quantity
    from public.cart_items ci
    where ci.cart_id = v_cart_id
    order by ci.created_at, ci.listing_id
  loop
    if v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'Invalid quantity in cart';
    end if;

    select l.*
      into v_listing
    from public.listings l
    where l.id = v_item.listing_id
    for update;

    if not found or v_listing.status <> 'active' then
      raise exception 'A listing in your cart is no longer available';
    end if;

    if v_listing.stock < v_item.quantity then
      raise exception 'Insufficient stock for %', v_listing.title;
    end if;

    v_subtotal := v_subtotal + (v_listing.price * v_item.quantity);

    insert into public.order_items (
      order_id, listing_id, seller_id, title_snapshot, unit_price, quantity
    )
    values (
      v_order,
      v_listing.id,
      v_listing.seller_id,
      v_listing.title,
      v_listing.price,
      v_item.quantity
    );

    update public.listings
    set stock = stock - v_item.quantity,
        status = case when stock - v_item.quantity = 0 then 'sold' else status end
    where id = v_listing.id;
  end loop;

  update public.orders
  set subtotal = v_subtotal
  where id = v_order;

  delete from public.cart_items
  where cart_id = v_cart_id;

  update public.carts
  set updated_at = now()
  where id = v_cart_id;

  return v_order;
end;
$$;

revoke all on function public.create_order_from_cart(text, text) from public, anon;
grant execute on function public.create_order_from_cart(text, text) to authenticated;

-- Buyers can read their own orders/items. Checkout itself is the only supported
-- client-side order creation path.
drop policy if exists orders_buyer_insert on public.orders;
drop policy if exists orders_buyer_update on public.orders;
drop policy if exists order_items_buyer_insert on public.order_items;

create index if not exists orders_buyer_created_idx
  on public.orders(buyer_id, created_at desc);

create index if not exists order_items_order_idx
  on public.order_items(order_id);
