# Atomos — Section 2.4.1: Supabase Cart

## What changed
- Cart data is stored in Supabase instead of localStorage.
- Adding a listing checks that it is active and has stock.
- Quantity changes are validated server-side and capped by current stock/99.
- Removing items and clearing the cart use authenticated RPCs.
- Cart rows re-read current listing price/stock from the database.
- The checkout button remains disabled until the secure checkout phase is implemented.

## SQL
Run `supabase-cart-phase.sql` once in Supabase SQL Editor.

## Test
1. Sign in.
2. Open one of your active seller listings.
3. Add quantity 1 to cart.
4. Open `/cart` and refresh — the item should remain.
5. Increase/decrease quantity.
6. Try to exceed stock — it should stop at available stock.
7. Remove the item.
8. Add it again, then close/reopen the browser and confirm the cart persists.
9. In Supabase, inspect `carts` and `cart_items`.
