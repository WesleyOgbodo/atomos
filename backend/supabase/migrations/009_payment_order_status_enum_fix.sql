-- 009_payment_order_status_enum_fix.sql
--
-- Purpose:
-- Fix enum/text type mismatches introduced by the payment and
-- seller-order notification functions.
--
-- These functions already exist in production because migrations
-- 007 and 008 have been applied. This migration safely replaces
-- the affected function definitions without replaying old migrations.


create or replace function public.ensure_seller_order_status(
  p_order_id uuid,
  p_seller_id uuid
)
returns public.seller_order_statuses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.seller_order_statuses;
begin
  insert into public.seller_order_statuses (
    order_id,
    seller_id,
    status
  )
  values (
    p_order_id,
    p_seller_id,
    'pending'::public.order_status
  )
  on conflict (order_id, seller_id)
  do update set
    updated_at = now()
  returning *
  into v_status;

  return v_status;
end;
$$;


create or replace function public.record_verified_paystack_payment(
  p_reference text,
  p_transaction_id bigint,
  p_amount_kobo bigint,
  p_requested_amount_kobo bigint,
  p_currency text,
  p_gateway_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select *
  into v_order
  from public.orders
  where payment_reference = p_reference
  for update;

  if not found then
    raise exception 'Order not found for payment reference';
  end if;

  if v_order.payment_status = 'paid'::public.payment_status then
    return v_order;
  end if;

  if p_currency <> 'NGN' then
    raise exception 'Unsupported payment currency';
  end if;

  if p_gateway_status <> 'success' then
    raise exception 'Payment was not successful';
  end if;

  if p_requested_amount_kobo <> round(v_order.total_amount * 100)::bigint then
    raise exception 'Payment amount does not match order total';
  end if;

  update public.orders
  set
    payment_status = 'paid'::public.payment_status,
    payment_transaction_id = p_transaction_id,
    payment_amount_kobo = p_amount_kobo,
    payment_currency = p_currency,
    payment_paid_at = now(),
    status = case
      when status = 'pending'::public.order_status
        then 'confirmed'::public.order_status
      else status
    end,
    updated_at = now()
  where id = v_order.id
  returning *
  into v_order;

  return v_order;
end;
$$;


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
     and new.payment_status = 'paid'::public.payment_status then

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
    do update set
      status = case
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