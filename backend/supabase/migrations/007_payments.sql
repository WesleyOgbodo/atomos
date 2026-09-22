-- Atomos Section 2.4.4 — Paystack payment state and secure server-side verification.
-- Run after 006_orders_management.sql.

create type public.payment_status as enum (
  'pending',
  'initiated',
  'paid',
  'failed',
  'abandoned'
);

alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists payment_transaction_id text,
  add column if not exists payment_authorization_url text,
  add column if not exists payment_currency text not null default 'NGN',
  add column if not exists paid_at timestamptz;

alter table public.orders
  drop constraint if exists orders_payment_provider_check;

alter table public.orders
  add constraint orders_payment_provider_check
  check (
    payment_provider is null
    or payment_provider = 'paystack'
  );

alter table public.orders
  drop constraint if exists orders_payment_currency_check;

alter table public.orders
  add constraint orders_payment_currency_check
  check (payment_currency = 'NGN');

create unique index if not exists orders_payment_reference_unique
  on public.orders(payment_reference)
  where payment_reference is not null;

create index if not exists orders_payment_status_idx
  on public.orders(buyer_id, payment_status, created_at desc);

-- Returns server-trusted payment details for the authenticated buyer.
-- The client never supplies the amount or email to Paystack.
create or replace function public.prepare_order_for_payment(
  p_order_id uuid
)
returns table (
  order_id uuid,
  order_number text,
  payment_reference text,
  payment_authorization_url text,
  customer_email text,
  amount_kobo bigint,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_email text;
  v_reference text;
  v_amount numeric(12,2);
  v_status public.payment_status;
  v_provider text;
  v_authorization_url text;
  v_currency text;
begin
  if v_buyer is null then
    raise exception 'Authentication required';
  end if;

  select
    o.payment_status,
    o.payment_provider,
    o.payment_reference,
    o.payment_authorization_url,
    o.total,
    o.payment_currency
  into
    v_status,
    v_provider,
    v_reference,
    v_authorization_url,
    v_amount,
    v_currency
  from public.orders o
  where o.id = p_order_id
    and o.buyer_id = v_buyer
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status = 'paid' then
    raise exception 'Order is already paid';
  end if;

  if v_currency <> 'NGN' then
    raise exception 'Unsupported payment currency';
  end if;

  if v_amount <= 0 then
    raise exception 'Order total must be greater than zero';
  end if;

  select au.email
    into v_email
  from auth.users au
  where au.id = v_buyer;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'A verified account email is required for payment';
  end if;

  if v_reference is null then
    v_reference :=
      'ATM-PAY-' ||
      upper(replace(gen_random_uuid()::text, '-', ''));
  end if;

  update public.orders
  set payment_provider = 'paystack',
      payment_reference = v_reference,
      payment_status = case
        when v_authorization_url is not null
          then v_status
        else 'initiated'
      end,
      updated_at = now()
  where id = p_order_id
    and buyer_id = v_buyer;

  return query
  select
    p_order_id,
    o.order_number,
    v_reference,
    v_authorization_url,
    v_email,
    round(o.total * 100)::bigint,
    o.payment_currency
  from public.orders o
  where o.id = p_order_id;
end;
$$;

revoke all
on function public.prepare_order_for_payment(uuid)
from public, anon;

grant execute
on function public.prepare_order_for_payment(uuid)
to authenticated;


-- Only the trusted payment Edge Function may persist Paystack's
-- hosted checkout URL.
create or replace function public.store_paystack_authorization_url(
  p_reference text,
  p_authorization_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reference is null
     or trim(p_reference) = ''
     or p_authorization_url is null
     or trim(p_authorization_url) = '' then
    raise exception 'Payment reference and authorization URL are required';
  end if;

  update public.orders
  set payment_authorization_url = trim(p_authorization_url),
      payment_status = 'initiated',
      updated_at = now()
  where payment_reference = trim(p_reference)
    and payment_provider = 'paystack'
    and payment_status <> 'paid';

  if not found then
    raise exception 'Payment reference not found or already paid';
  end if;
end;
$$;

revoke all
on function public.store_paystack_authorization_url(text, text)
from public, anon, authenticated;


-- Only trusted server-side payment handlers may mark an order paid.
-- This function is deliberately not executable by browser clients.
drop function if exists public.record_verified_paystack_payment(
  text,
  text,
  bigint,
  text,
  text
);

drop function if exists public.record_verified_paystack_payment(
  text,
  text,
  bigint,
  bigint,
  text,
  text
);

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
as $$
declare
  v_order public.orders;
  v_expected_kobo bigint;
begin
  if p_reference is null
     or trim(p_reference) = '' then
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

  v_expected_kobo :=
    round(v_order.total * 100)::bigint;

  if upper(coalesce(p_currency, '')) <> 'NGN' then
    raise exception 'Unexpected payment currency';
  end if;

  if p_requested_amount_kobo <> v_expected_kobo then
    raise exception 'Payment requested amount does not match order total';
  end if;

  if lower(coalesce(p_gateway_status, '')) <> 'success' then
    update public.orders
    set payment_status = 'failed',
        updated_at = now()
    where id = v_order.id;

    return v_order.id;
  end if;

  if v_order.payment_status = 'paid' then
    return v_order.id;
  end if;

  update public.orders
  set payment_status = 'paid',
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
$$;

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


-- Store an abandoned payment attempt without changing
-- order ownership/status.
create or replace function public.mark_order_payment_abandoned(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set payment_status = 'abandoned',
      updated_at = now()
  where id = p_order_id
    and buyer_id = auth.uid()
    and payment_status <> 'paid';

  if not found then
    raise exception 'Order not found or payment is already complete';
  end if;
end;
$$;

revoke all
on function public.mark_order_payment_abandoned(uuid)
from public, anon;

grant execute
on function public.mark_order_payment_abandoned(uuid)
to authenticated;