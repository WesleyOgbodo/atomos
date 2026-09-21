-- Atomos Section 2.4.3 — Buyer + seller order management.
-- Run after 005_secure_checkout.sql.

-- Stable human-readable order reference.
alter table public.orders
  add column if not exists order_number text;

update public.orders
set order_number = 'ATM-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where order_number is null;

alter table public.orders
  alter column order_number set default ('ATM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

alter table public.orders
  alter column order_number set not null;

create unique index if not exists orders_order_number_uidx
  on public.orders(order_number);

-- Direct client updates are not allowed. State changes go through the RPCs below.
drop policy if exists orders_buyer_update on public.orders;
drop policy if exists orders_seller_read on public.orders;

drop function if exists public.is_order_seller(uuid);

create or replace function public.is_order_seller(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.seller_id = auth.uid()
  );
$$;

revoke all on function public.is_order_seller(uuid) from public, anon;
grant execute on function public.is_order_seller(uuid) to authenticated;

create policy orders_seller_read
on public.orders
for select
to authenticated
using (
  public.is_order_seller(id)
);

-- Buyer cancellation is intentionally limited to pending orders.
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_status public.order_status;
  v_item record;
begin
  if v_buyer is null then
    raise exception 'Authentication required';
  end if;

  select o.status
    into v_status
  from public.orders o
  where o.id = p_order_id
    and o.buyer_id = v_buyer
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'Only pending orders can be cancelled';
  end if;

  for v_item in
    select oi.listing_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.listing_id is not null then
      update public.listings l
      set stock = least(999, l.stock + v_item.quantity),
          status = case
            when l.status = 'sold' and l.stock + v_item.quantity > 0 then 'active'
            else l.status
          end
      where l.id = v_item.listing_id;
    end if;
  end loop;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and buyer_id = v_buyer;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- Seller order view. One row is returned for each seller-owned order item.
-- This keeps buyer contact information behind a server-side ownership check.
create or replace function public.get_seller_orders()
returns table (
  order_id uuid,
  order_number text,
  buyer_id uuid,
  buyer_name text,
  buyer_phone text,
  status public.order_status,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  delivery_method text,
  delivery_address text,
  created_at timestamptz,
  item_id uuid,
  listing_id uuid,
  title_snapshot text,
  unit_price numeric,
  quantity integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.id,
    o.order_number,
    o.buyer_id,
    coalesce(p.full_name, '') as buyer_name,
    coalesce(p.phone, '') as buyer_phone,
    o.status,
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.delivery_method,
    o.delivery_address,
    o.created_at,
    oi.id,
    oi.listing_id,
    oi.title_snapshot,
    oi.unit_price,
    oi.quantity
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.profiles p on p.id = o.buyer_id
  where oi.seller_id = auth.uid()
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and me.role = 'seller'
        and not me.is_suspended
    )
  order by o.created_at desc, oi.created_at asc;
$$;

revoke all on function public.get_seller_orders() from public, anon;
grant execute on function public.get_seller_orders() to authenticated;

-- Seller status changes are server validated. A seller cannot alter an order
-- that contains another seller's item because order status is currently order-level.
create or replace function public.seller_update_order_status(
  p_order_id uuid,
  p_next_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v_current public.order_status;
  v_item_count integer;
  v_seller_item_count integer;
  v_item record;
begin
  if v_seller is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_seller and p.role = 'seller' and not p.is_suspended
  ) then
    raise exception 'Seller access required';
  end if;

  select o.status
    into v_current
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  select count(*), count(*) filter (where oi.seller_id = v_seller)
    into v_item_count, v_seller_item_count
  from public.order_items oi
  where oi.order_id = p_order_id;

  if v_item_count = 0 or v_seller_item_count <> v_item_count then
    raise exception 'This order contains items from another seller and cannot be managed as one seller order yet';
  end if;

  if p_next_status = 'confirmed' and v_current = 'pending' then
    update public.orders set status = 'confirmed' where id = p_order_id;
    return;
  end if;

  if p_next_status = 'processing' and v_current = 'confirmed' then
    update public.orders set status = 'processing' where id = p_order_id;
    return;
  end if;

  if p_next_status = 'ready_for_delivery' and v_current = 'processing' then
    update public.orders set status = 'ready_for_delivery' where id = p_order_id;
    return;
  end if;

  if p_next_status = 'delivered' and v_current = 'ready_for_delivery' then
    update public.orders set status = 'delivered' where id = p_order_id;
    return;
  end if;

  if p_next_status = 'cancelled' and v_current in ('pending', 'confirmed') then
    for v_item in
      select oi.listing_id, oi.quantity
      from public.order_items oi
      where oi.order_id = p_order_id
    loop
      if v_item.listing_id is not null then
        update public.listings l
        set stock = least(999, l.stock + v_item.quantity),
            status = case
              when l.status = 'sold' and l.stock + v_item.quantity > 0 then 'active'
              else l.status
            end
        where l.id = v_item.listing_id;
      end if;
    end loop;

    update public.orders set status = 'cancelled' where id = p_order_id;
    return;
  end if;

  raise exception 'Invalid order status transition from % to %', v_current, p_next_status;
end;
$$;

revoke all on function public.seller_update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.seller_update_order_status(uuid, public.order_status) to authenticated;
