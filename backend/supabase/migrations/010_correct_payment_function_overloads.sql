begin;

-- 009 accidentally created overloads instead of replacing the
-- production functions. Remove those incorrect overloads.

drop function if exists public.record_verified_paystack_payment(
  text,
  bigint,
  bigint,
  bigint,
  text,
  text
);

drop function if exists public.ensure_seller_order_status(
  uuid,
  uuid
);

-- Restore the actual payment function signature used by the
-- deployed Paystack Edge Functions.

create or replace function public.record_verified_paystack_payment(
  p_reference text,
  p_transaction_id text,
  p_amount_kobo bigint,
  p_requested_amount_kobo bigint,
  p_currency text,
  p_gateway_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.orders;
  v_expected_kobo bigint;
begin
  if p_reference is null or trim(p_reference) = '' then
    raise exception 'Payment reference is required';
  end if;

  select o.*
  into v_order
  from public.orders o
  where o.payment_reference = trim(p_reference)
    and o.payment_provider = 'paystack'
  for update;

  if not found then
    raise exception 'Payment reference not found';
  end if;

  v_expected_kobo := round(v_order.total * 100)::bigint;

  if upper(coalesce(p_currency, '')) <> 'NGN' then
    raise exception 'Unexpected payment currency';
  end if;

  if p_requested_amount_kobo <> v_expected_kobo then
    raise exception 'Payment requested amount does not match order total';
  end if;

  if lower(coalesce(p_gateway_status, '')) <> 'success' then
    update public.orders
    set
      payment_status = 'failed'::public.payment_status,
      updated_at = now()
    where id = v_order.id;

    return v_order.id;
  end if;

  if v_order.payment_status = 'paid'::public.payment_status then
    return v_order.id;
  end if;

  update public.orders
  set
    payment_status = 'paid'::public.payment_status,
    payment_transaction_id =
      coalesce(
        nullif(trim(p_transaction_id), ''),
        payment_transaction_id
      ),
    paid_at = coalesce(paid_at, now()),
    updated_at = now(),
    status = case
      when status = 'pending'::public.order_status
        then 'confirmed'::public.order_status
      else status
    end
  where id = v_order.id;

  return v_order.id;
end;
$function$;

revoke all
on function public.record_verified_paystack_payment(
  text,
  text,
  bigint,
  bigint,
  text,
  text
)
from public, anon, authenticated;


-- Restore the actual trigger function signature.

create or replace function public.ensure_seller_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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
    on conflict (order_id, seller_id)
    do nothing;
  end if;

  return new;
end;
$function$;

revoke all
on function public.ensure_seller_order_status()
from public, anon, authenticated;


-- Keep the payment-success trigger explicitly enum-safe.

create or replace function public.notify_order_payment_success()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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
$function$;

revoke all
on function public.notify_order_payment_success()
from public, anon, authenticated;

commit;