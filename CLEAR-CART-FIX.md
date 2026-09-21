# Clear Cart Fix

The cart service now exports `clearMyCart()` and retains `clearCart` as a backwards-compatible alias.

The Cart page now exposes a **Clear cart** action with confirmation, calls the authenticated `clear_my_cart` RPC, disables conflicting cart controls while clearing, and immediately empties the local cart after a successful RPC.

The database migration `backend/supabase/migrations/004_cart.sql` defines `clear_my_cart()` as a `SECURITY DEFINER` function that requires an authenticated user and deletes only items belonging to that user's cart.
