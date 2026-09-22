-- Atomos Section 2.4.5 — Seller order operations,
-- per-seller fulfillment state, notifications.
-- Run after 007_payments.sql.

-- A marketplace order can contain listings from multiple sellers.
-- Order-level status is retained for buyer-facing compatibility,
-- while this table stores each seller's own fulfillment state.
create table if not exists public.seller_order_statuses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders(id)
    on delete cascade,
  seller_id uuid not null
    references public.profiles(id)
    on delete restrict,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, seller_id)
);

create index if not exists seller_order_statuses_seller_created_idx
  on public.seller_order_statuses(
    seller_id,
    created_at desc
  );

create index if not exists seller_order_statuses_order_idx
  on public.seller_order_statuses(order_id);

alter table public.seller_order_statuses
enable row level security;

drop policy if exists seller_order_statuses_self_read
on public.seller_order_statuses;

create policy seller_order_statuses_self_read
on public.seller_order_statuses
for select
to authenticated
using (seller_id = auth.uid());


-- Maintain updated_at on seller status rows.
drop trigger if exists seller_order_statuses_updated_at
on public.seller_order_statuses;

create trigger seller_order_statuses_updated_at
before update on public.seller_order_statuses
for each row
execute function public.set_updated_at();


-- Create a seller state row whenever an order item is created.
-- The checkout function remains the source of truth for item ownership.
create or replace function public.ensure_seller_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.seller_id is not null then
    insert into public.seller_order_statuses (
      order_id,
      seller_id,
      status
    )
    values (
      new.order_id,
      new.seller_id,
      'pending'::public.order_status
    )
    on conflict (order_id, seller_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all
on function public.ensure_seller_order_status()
from public, anon, authenticated;

drop trigger if exists order_items_ensure_seller_status
on public.order_items;

create trigger order_items_ensure_seller_status
after insert on public.order_items
for each row
execute function public.ensure_seller_order_status();


-- Backfill existing orders.
insert into public.seller_order_statuses (
  order_id,
  seller_id,
  status
)
select distinct
  oi.order_id,
  oi.seller_id,
  case
    when o.status = 'cancelled'
      then 'cancelled'::public.order_status
    else o.status
  end
from public.order_items oi
join public.orders o
  on o.id = oi.order_id
where oi.seller_id is not null
on conflict (order_id, seller_id)
do update
set status = excluded.status,
    updated_at = now();


-- Buyer-visible order status is the slowest active seller status.
-- This keeps mixed-seller orders honest without allowing one seller
-- to mutate another seller's state.
create or replace function public.refresh_order_status(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_active_count integer;
  v_total_count integer;
begin
  select
    count(*),
    count(*) filter (where status <> 'cancelled')
  into
    v_total_count,
    v_active_count
  from public.seller_order_statuses
  where order_id = p_order_id;

  if v_total_count = 0 then
    return;
  end if;

  if v_active_count = 0 then
    v_status := 'cancelled'::public.order_status;

  elsif exists (
    select 1
    from public.seller_order_statuses
    where order_id = p_order_id
      and status = 'pending'::public.order_status
  ) then
    v_status := 'pending'::public.order_status;

  elsif exists (
    select 1
    from public.seller_order_statuses
    where order_id = p_order_id
      and status = 'confirmed'::public.order_status
  ) then
    v_status := 'confirmed'::public.order_status;

  elsif exists (
    select 1
    from public.seller_order_statuses
    where order_id = p_order_id
      and status = 'processing'::public.order_status
  ) then
    v_status := 'processing'::public.order_status;

  elsif exists (
    select 1
    from public.seller_order_statuses
    where order_id = p_order_id
      and status = 'ready_for_delivery'::public.order_status
  ) then
    v_status := 'ready_for_delivery'::public.order_status;

  else
    v_status := 'delivered'::public.order_status;
  end if;

  update public.orders
  set status = v_status,
      updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all
on function public.refresh_order_status(uuid)
from public, anon, authenticated;


-- Replace the seller dashboard RPC so each seller receives
-- only their own items and their own fulfillment status.
drop function if exists public.get_seller_orders();

create or replace function public.get_seller_orders()
returns table (
  order_id uuid,
  order_number text,
  buyer_id uuid,
  buyer_name text,
  buyer_phone text,
  global_status public.order_status,
  seller_status public.order_status,
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
    sos.status,
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
  join public.order_items oi
    on oi.order_id = o.id
  join public.seller_order_statuses sos
    on sos.order_id = o.id
   and sos.seller_id = auth.uid()
  left join public.profiles p
    on p.id = o.buyer_id
  where oi.seller_id = auth.uid()
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role = 'seller'
        and not me.is_suspended
    )
  order by
    o.created_at desc,
    oi.created_at asc;
$$;

revoke all
on function public.get_seller_orders()
from public, anon;

grant execute
on function public.get_seller_orders()
to authenticated;


-- Replace the previous seller status RPC
-- with seller-scoped transitions.
drop function if exists public.seller_update_order_status(
  uuid,
  public.order_status
);

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
  v_order_status public.order_status;
  v_seller_count integer;
  v_item record;
begin
  if v_seller is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_seller
      and p.role = 'seller'
      and not p.is_suspended
  ) then
    raise exception 'Seller access required';
  end if;

  if not exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.seller_id = v_seller
  ) then
    raise exception 'This order does not contain your listings';
  end if;

  insert into public.seller_order_statuses (
    order_id,
    seller_id,
    status
  )
  values (
    p_order_id,
    v_seller,
    'pending'::public.order_status
  )
  on conflict (order_id, seller_id) do nothing;

  select
    sos.status,
    o.status
  into
    v_current,
    v_order_status
  from public.seller_order_statuses sos
  join public.orders o
    on o.id = sos.order_id
  where sos.order_id = p_order_id
    and sos.seller_id = v_seller
  for update of sos;

  if p_next_status = 'confirmed'::public.order_status
     and v_current = 'pending'::public.order_status then

    if v_order_status = 'pending'::public.order_status
       and not exists (
         select 1
         from public.orders o
         where o.id = p_order_id
           and o.payment_status = 'paid'
       ) then
      raise exception 'The order must be paid before it can be confirmed';
    end if;

  elsif p_next_status = 'processing'::public.order_status
        and v_current <> 'confirmed'::public.order_status then

    raise exception
      'Invalid order status transition from % to %',
      v_current,
      p_next_status;

  elsif p_next_status = 'ready_for_delivery'::public.order_status
        and v_current <> 'processing'::public.order_status then

    raise exception
      'Invalid order status transition from % to %',
      v_current,
      p_next_status;

  elsif p_next_status = 'delivered'::public.order_status
        and v_current <> 'ready_for_delivery'::public.order_status then

    raise exception
      'Invalid order status transition from % to %',
      v_current,
      p_next_status;

  elsif p_next_status = 'cancelled'::public.order_status then

    if v_current not in (
      'pending'::public.order_status,
      'confirmed'::public.order_status
    ) then
      raise exception
        'Only pending or confirmed seller orders can be cancelled';
    end if;

    select count(distinct oi.seller_id)
      into v_seller_count
    from public.order_items oi
    where oi.order_id = p_order_id;

    if v_seller_count <> 1 then
      raise exception
        'Seller cancellation for multi-seller orders is not enabled yet';
    end if;

    for v_item in
      select
        oi.listing_id,
        oi.quantity
      from public.order_items oi
      where oi.order_id = p_order_id
        and oi.seller_id = v_seller
    loop
      if v_item.listing_id is not null then
        update public.listings l
        set stock = least(999, l.stock + v_item.quantity),
            status = case
              when l.status = 'sold'
                   and l.stock + v_item.quantity > 0
                then 'active'
              else l.status
            end
        where l.id = v_item.listing_id;
      end if;
    end loop;

  elsif p_next_status = v_current then
    return;

  elsif p_next_status <> 'confirmed'::public.order_status then
    raise exception
      'Invalid order status transition from % to %',
      v_current,
      p_next_status;
  end if;

  update public.seller_order_statuses
  set status = p_next_status,
      updated_at = now()
  where order_id = p_order_id
    and seller_id = v_seller;

  perform public.refresh_order_status(p_order_id);
end;
$$;

revoke all
on function public.seller_update_order_status(
  uuid,
  public.order_status
)
from public, anon;

grant execute
on function public.seller_update_order_status(
  uuid,
  public.order_status
)
to authenticated;


-- If a buyer cancels an entire order,
-- keep seller states consistent.
create or replace function public.sync_seller_status_on_order_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled'::public.order_status
     and old.status <> 'cancelled'::public.order_status then

    update public.seller_order_statuses
    set status = 'cancelled'::public.order_status,
        updated_at = now()
    where order_id = new.id
      and status <> 'cancelled'::public.order_status;
  end if;

  return new;
end;
$$;

revoke all
on function public.sync_seller_status_on_order_cancel()
from public, anon, authenticated;

drop trigger if exists orders_sync_seller_status_on_cancel
on public.orders;

create trigger orders_sync_seller_status_on_cancel
after update of status on public.orders
for each row
execute function public.sync_seller_status_on_order_cancel();


-- Payment success should unlock every seller's order state
-- and notify each seller.
create or replace function public.notify_order_payment_success()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_order_number text;
begin
  if old.payment_status is distinct from new.payment_status
     and new.payment_status = 'paid' then

    v_order_number := new.order_number;

    insert into public.seller_order_statuses (
      order_id,
      seller_id,
      status
    )
    select distinct
      new.id,
      oi.seller_id,
      'confirmed'::public.order_status
    from public.order_items oi
    where oi.order_id = new.id
      and oi.seller_id is not null
    on conflict (order_id, seller_id)
    do update
      set status = case
        when public.seller_order_statuses.status =
             'pending'::public.order_status
          then 'confirmed'::public.order_status
        else public.seller_order_statuses.status
      end,
      updated_at = now();

    for v_seller in
      select distinct oi.seller_id
      from public.order_items oi
      where oi.order_id = new.id
        and oi.seller_id is not null
    loop
      insert into public.notifications (
        user_id,
        type,
        title,
        body
      )
      values (
        v_seller,
        'order_paid',
        'New paid order',
        format(
          'Order %s has been paid and contains one or more of your listings.',
          v_order_number
        )
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all
on function public.notify_order_payment_success()
from public, anon, authenticated;

drop trigger if exists orders_notify_payment_success
on public.orders;

create trigger orders_notify_payment_success
after update of payment_status on public.orders
for each row
execute function public.notify_order_payment_success();


-- Notify the buyer when the overall order state changes.
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if old.status is distinct from new.status then

    v_title := case new.status
      when 'confirmed' then 'Order confirmed'
      when 'processing' then 'Order is being processed'
      when 'ready_for_delivery' then 'Order ready'
      when 'delivered' then 'Order delivered'
      when 'cancelled' then 'Order cancelled'
      else 'Order updated'
    end;

    v_body := format(
      'Order %s is now %s.',
      new.order_number,
      replace(new.status::text, '_', ' ')
    );

    insert into public.notifications (
      user_id,
      type,
      title,
      body
    )
    values (
      new.buyer_id,
      'order_status',
      v_title,
      v_body
    );
  end if;

  return new;
end;
$$;

revoke all
on function public.notify_order_status_change()
from public, anon, authenticated;

drop trigger if exists orders_notify_status_change
on public.orders;

create trigger orders_notify_status_change
after update of status on public.orders
for each row
execute function public.notify_order_status_change();


-- Per-seller state changes also notify the buyer,
-- but only when the seller's transition changes the
-- order's observable fulfillment progress.
create or replace function public.notify_seller_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_order_number text;
  v_title text;
  v_payment_status public.payment_status;
begin
  if old.status is distinct from new.status then

    select
      o.buyer_id,
      o.order_number,
      o.payment_status
    into
      v_buyer,
      v_order_number,
      v_payment_status
    from public.orders o
    where o.id = new.order_id;

    v_title := case new.status
      when 'confirmed' then 'Seller confirmed your order'
      when 'processing' then 'Seller is processing your order'
      when 'ready_for_delivery' then 'Seller marked your order ready'
      when 'delivered' then 'Seller marked your order delivered'
      when 'cancelled' then 'Seller cancelled your order'
      else 'Seller order updated'
    end;

    if not (
      new.status = 'confirmed'::public.order_status
      and v_payment_status = 'paid'
    ) then

      insert into public.notifications (
        user_id,
        type,
        title,
        body
      )
      values (
        v_buyer,
        'seller_order_status',
        v_title,
        format(
          'Order %s has a seller update: %s.',
          v_order_number,
          replace(new.status::text, '_', ' ')
        )
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all
on function public.notify_seller_status_change()
from public, anon, authenticated;

drop trigger if exists seller_order_statuses_notify_buyer
on public.seller_order_statuses;

create trigger seller_order_statuses_notify_buyer
after update of status on public.seller_order_statuses
for each row
execute function public.notify_seller_status_change();


-- Payment confirmation is the authority for seller confirmation.
-- If an order is already paid when this migration runs,
-- ensure its seller states are ready.
insert into public.seller_order_statuses (
  order_id,
  seller_id,
  status
)
select distinct
  oi.order_id,
  oi.seller_id,
  case
    when o.status = 'pending'::public.order_status
      then 'confirmed'::public.order_status
    else o.status
  end
from public.order_items oi
join public.orders o
  on o.id = oi.order_id
where oi.seller_id is not null
  and o.payment_status = 'paid'
on conflict (order_id, seller_id)
do update
set status = case
  when public.seller_order_statuses.status =
       'pending'::public.order_status
    then excluded.status
  else public.seller_order_statuses.status
end,
updated_at = now();