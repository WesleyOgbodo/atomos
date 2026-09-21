# Live Atomos Listings Fix

The storefront now reads active listings from Supabase instead of relying only on the local demo catalogue.

- `frontend/frontend/src/services/products.ts` fetches active, in-stock listings and their category/brand/photo metadata.
- Private listing photos are converted to signed Storage URLs for display.
- `frontend/src/hooks/useProducts.ts` loads live listings into React state.
- Home, category listings, search, product details and chat use the live product service.
- Demo catalogue products remain as fallback/content, so a temporary Supabase read failure does not blank the storefront.
- Create Listing/authentication code is not changed by this fix.


## Important Supabase policy fix

The storefront needs read access to `listing_photos` for active listings and to the corresponding Storage objects. Run the supplied SQL patch in Supabase SQL Editor before testing live seller listings.
