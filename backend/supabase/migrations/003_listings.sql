-- Atomos Backend — Section 2.3: Listings
-- Run AFTER 001_initial_schema.sql.
-- This migration hardens listing ownership/status rules and adds private photo storage policies.

-- -----------------------------------------------------------------------------
-- 1. Prevent normal users from changing their own role or suspension state.
-- -----------------------------------------------------------------------------

drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update_safe on public.profiles
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and is_suspended = (select p.is_suspended from public.profiles p where p.id = auth.uid())
);

-- -----------------------------------------------------------------------------
-- 2. Listing validation helpers.
-- -----------------------------------------------------------------------------

create or replace function public.validate_listing_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller_role public.user_role;
  seller_suspended boolean;
  old_status public.listing_status;
begin
  select role, is_suspended
    into seller_role, seller_suspended
  from public.profiles
  where id = new.seller_id;

  if seller_role is null then
    raise exception 'Seller profile does not exist';
  end if;

  if seller_role <> 'seller' then
    raise exception 'Only seller accounts can create listings';
  end if;

  if seller_suspended then
    raise exception 'Suspended sellers cannot modify listings';
  end if;

  if tg_op = 'UPDATE' then
    old_status := old.status;

    if new.seller_id <> old.seller_id then
      raise exception 'Listing ownership cannot be transferred this way';
    end if;

    if new.status = 'removed' and old_status <> 'removed' then
      raise exception 'Only trusted moderation functions can remove listings';
    end if;
  end if;

  if new.status = 'active' and new.stock < 1 then
    raise exception 'An active listing must have at least one item in stock';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_validate_write on public.listings;
create trigger listings_validate_write
before insert or update on public.listings
for each row execute function public.validate_listing_write();

-- Sellers may only mutate their own listings while the trigger enforces role/suspension rules.
drop policy if exists listings_seller_insert on public.listings;
create policy listings_seller_insert_safe on public.listings
for insert
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

drop policy if exists listings_seller_update on public.listings;
create policy listings_seller_update_safe on public.listings
for update
using (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
)
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

drop policy if exists listings_seller_delete on public.listings;
create policy listings_seller_delete_safe on public.listings
for delete
using (
  seller_id = auth.uid()
  and status in ('draft', 'archived')
);

-- -----------------------------------------------------------------------------
-- 3. Listing photo validation and private Storage bucket.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false)
on conflict (id) do update set public = false;

-- Listing photo rows must belong to a listing owned by the authenticated seller.
drop policy if exists listing_photos_seller_insert on public.listing_photos;
create policy listing_photos_seller_insert_safe on public.listing_photos
for insert
with check (
  exists (
    select 1
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    where l.id = listing_photos.listing_id
      and l.seller_id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

drop policy if exists listing_photos_seller_update on public.listing_photos;
create policy listing_photos_seller_update_safe on public.listing_photos
for update
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
  )
);

drop policy if exists listing_photos_seller_delete on public.listing_photos;
create policy listing_photos_seller_delete_safe on public.listing_photos
for delete
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_photos.listing_id and l.seller_id = auth.uid()
  )
);

-- Storage object names should begin with the authenticated seller's UUID.
drop policy if exists listing_photos_storage_insert on storage.objects;
create policy listing_photos_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'seller'
      and p.is_suspended = false
  )
);

drop policy if exists listing_photos_storage_read on storage.objects;
create policy listing_photos_storage_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (
      select 1
      from public.listing_photos lp
      join public.listings l on l.id = lp.listing_id
      where l.status = 'active'
        and lp.storage_path = name
    )
  )
);

drop policy if exists listing_photos_storage_update on storage.objects;
create policy listing_photos_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists listing_photos_storage_delete on storage.objects;
create policy listing_photos_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- -----------------------------------------------------------------------------
-- 4. Safe view counter.
-- -----------------------------------------------------------------------------

create or replace function public.increment_listing_view(listing_uuid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set view_count = view_count + 1
  where id = listing_uuid
    and status = 'active';
$$;

revoke all on function public.increment_listing_view(uuid) from public;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Useful listing read function for frontend pagination/filtering.
-- -----------------------------------------------------------------------------

create or replace function public.search_listings(
  p_category_slug text default null,
  p_brand_slug text default null,
  p_condition public.listing_condition default null,
  p_max_price numeric default null,
  p_location text default null,
  p_sort text default 'newest',
  p_limit integer default 24,
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
  status public.listing_status,
  specs jsonb,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  category_id uuid,
  category_name text,
  category_slug text,
  brand_id uuid,
  brand_name text,
  brand_slug text,
  seller_id uuid,
  seller_name text,
  seller_avatar_url text,
  photo_path text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.description,
    l.price,
    l.condition,
    l.location,
    l.stock,
    l.status,
    l.specs,
    l.view_count,
    l.created_at,
    l.updated_at,
    c.id,
    c.name,
    c.slug,
    b.id,
    b.name,
    b.slug,
    l.seller_id,
    p.full_name,
    p.avatar_url,
    (
      select lp.storage_path
      from public.listing_photos lp
      where lp.listing_id = l.id
      order by lp.sort_order asc, lp.created_at asc
      limit 1
    )
  from public.listings l
  join public.categories c on c.id = l.category_id
  left join public.brands b on b.id = l.brand_id
  join public.profiles p on p.id = l.seller_id
  where l.status = 'active'
    and (p_category_slug is null or c.slug = p_category_slug)
    and (p_brand_slug is null or b.slug = p_brand_slug)
    and (p_condition is null or l.condition = p_condition)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_location is null or l.location ilike '%' || p_location || '%')
  order by
    case when p_sort = 'price-low' then l.price end asc,
    case when p_sort = 'price-high' then l.price end desc,
    case when p_sort = 'views' then l.view_count end desc,
    case when p_sort = 'oldest' then l.created_at end asc,
    l.created_at desc
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset);
$$;

grant execute on function public.search_listings(text, text, public.listing_condition, numeric, text, text, integer, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Seller dashboard read policy.
-- -----------------------------------------------------------------------------

-- Sellers already have access to their own listings through the existing public
-- read policy. Keep that behavior explicit for drafts and archived listings.
drop policy if exists active_listings_public_read on public.listings;
create policy active_listings_public_read_safe on public.listings
for select
using (
  status = 'active'
  or seller_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- 7. Helpful constraints/indexes for listing queries.
-- -----------------------------------------------------------------------------

create index if not exists listings_active_created_idx
  on public.listings(created_at desc)
  where status = 'active';

create index if not exists listings_active_price_idx
  on public.listings(price)
  where status = 'active';

create index if not exists listings_active_location_idx
  on public.listings(location)
  where status = 'active';

-- Partial search index for common marketplace title/description searches.
create index if not exists listings_search_tsv_idx
  on public.listings
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
