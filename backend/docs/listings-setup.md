# Atomos — Section 2.3 Listings Setup

This migration builds on `001_initial_schema.sql`.

## 1. Run the migration

In Supabase:

1. Open **SQL Editor**.
2. Create a new query.
3. Paste `supabase/migrations/002_listings.sql`.
4. Run it.
5. Confirm there are no SQL errors.

Do **not** rerun `001_initial_schema.sql` on the existing project.

## 2. Seller testing account

New registrations are buyers by default. That is intentional.

For development/testing only, you can promote a test account after registration:

```sql
update public.profiles
set role = 'seller'
where id = 'USER_UUID_HERE';
```

Use the UUID from **Authentication → Users**.

Do not expose this SQL in the public frontend. In production, seller onboarding/admin approval will use a controlled server-side flow.

## 3. Listing rules

A seller can:

- create a draft or active listing;
- edit their own listing;
- archive their own listing;
- mark a listing sold;
- delete draft/archived listings.

A seller cannot:

- create a listing while suspended;
- create a listing as a buyer;
- change the owner of a listing;
- remove a listing through the normal client policy;
- activate a listing with zero stock.

## 4. Photos

The migration creates a **private** Storage bucket:

`listing-photos`

Recommended object path:

```text
SELLER_UUID/LISTING_UUID/random-file-name.jpg
```

Use signed URLs for displaying private photos. Do not make the bucket public just to simplify the frontend.

The first implementation should support multiple photos per listing. A later frontend step will enforce file type/size and generate signed URLs.

## 5. Listing search

The migration adds `public.search_listings(...)` for filtered, paginated catalogue reads.

It supports:

- category slug
- brand slug
- condition
- maximum price
- location text
- newest
- oldest
- price low/high
- most viewed
- limit/offset

The function caps a request at 50 records.

## 6. View counts

Use:

```sql
select public.increment_listing_view('LISTING_UUID');
```

The function only increments active listings.

## 7. Important frontend rule

Do not replace `frontend/src/data/products.ts` with direct table access everywhere.

Create a single listings service around Supabase. That service should translate database rows into the existing `Product` UI model until Section 3 replaces the demo catalogue completely.
