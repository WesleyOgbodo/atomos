-- Atomos Section 2.3: marketplace discovery + safe view counter
-- Run this in Supabase SQL Editor after the existing Atomos schema/listing migration.

create or replace function public.search_listings(
  p_search text default null,
  p_category text default null,
  p_brand text default null,
  p_condition public.listing_condition default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_location text default null,
  p_sort text default 'newest',
  p_limit integer default 32,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  price numeric,
  condition public.listing_condition,
  location text,
  stock integer,
  created_at timestamptz,
  view_count integer,
  category_name text,
  brand_name text,
  photo_paths text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      l.id,
      l.title,
      l.description,
      l.price,
      l.condition,
      l.location,
      l.stock,
      l.created_at,
      l.view_count,
      c.name as category_name,
      b.name as brand_name,
      coalesce(
        array_agg(lp.storage_path order by lp.sort_order)
          filter (where lp.storage_path is not null),
        '{}'::text[]
      ) as photo_paths
    from public.listings l
    left join public.categories c on c.id = l.category_id
    left join public.brands b on b.id = l.brand_id
    left join public.listing_photos lp on lp.listing_id = l.id
    where l.status = 'active'
      and l.stock > 0
      and (p_category is null or c.name = p_category)
      and (p_brand is null or b.name = p_brand)
      and (p_condition is null or l.condition = p_condition)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (p_location is null or position(lower(p_location) in lower(l.location)) > 0)
      and (
        p_search is null
        or position(lower(p_search) in lower(l.title)) > 0
        or position(lower(p_search) in lower(coalesce(l.description, ''))) > 0
        or position(lower(p_search) in lower(l.location)) > 0
        or position(lower(p_search) in lower(coalesce(c.name, ''))) > 0
        or position(lower(p_search) in lower(coalesce(b.name, ''))) > 0
      )
    group by l.id, c.name, b.name
  ), counted as (
    select filtered.*, count(*) over () as total_count
    from filtered
  )
  select *
  from counted
  order by
    case when p_sort = 'price-low' then price end asc nulls last,
    case when p_sort = 'price-high' then price end desc nulls last,
    case when p_sort = 'oldest' then created_at end asc nulls last,
    case when p_sort = 'views' then view_count end desc nulls last,
    case when p_sort = 'newest' or p_sort is null then created_at end desc nulls last,
    created_at desc
  limit greatest(1, least(coalesce(p_limit, 32), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- The previous implementation may have a different return type. Drop it before
-- recreating the secure version so PostgreSQL does not reject the return shape.
drop function if exists public.increment_listing_view(uuid);

create or replace function public.increment_listing_view(p_listing_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'active'
    and stock > 0
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.search_listings(text, text, text, public.listing_condition, numeric, numeric, text, text, integer, integer) to anon, authenticated;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
