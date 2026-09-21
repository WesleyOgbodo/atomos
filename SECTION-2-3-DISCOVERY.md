# Atomos — Section 2.3 Marketplace Discovery

This package adds the next marketplace layer:

- Supabase-backed search across title, description, brand, category and location.
- Server-side filters for category, brand, condition, price and location.
- Server-side sorting by newest, oldest, price and views.
- Paginated live listings with automatic load-more as the user scrolls.
- Seller photo URLs loaded from the private `listing-photos` bucket.
- Safe listing view counter RPC.
- Active + in-stock listings only.

## Required Supabase step

Before testing the new Search and category pages, open Supabase SQL Editor and run:

`supabase-search-listings.sql`

The migration deliberately drops the previous `increment_listing_view(uuid)` function before recreating it because PostgreSQL cannot change an existing function's return type in place.

## Test checklist

1. Run the SQL migration.
2. Start the frontend.
3. Open `/search`.
4. Search for a word from a real listing title.
5. Test Used / Brand New.
6. Test brand and category.
7. Test min/max price.
8. Test location.
9. Change sorting.
10. Scroll until the next batch loads.
11. Open a seller listing and confirm the page loads all uploaded photos.
12. Refresh/open the same listing again and check `listings.view_count` increases in Supabase.
13. Confirm draft, archived and zero-stock listings never appear publicly.
