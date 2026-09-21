# Atomos backend

Atomos uses Supabase/Postgres as its backend. The `supabase/migrations` directory contains the database schema, RLS policies, security functions, listing/cart logic and checkout transaction.

## Current migrations

1. `001_initial_schema.sql` — core marketplace schema and RLS
2. `002_security_hardening.sql` — hardened RPCs and security rules
3. `003_listings.sql` — seller listings and listing lifecycle
4. `004_cart.sql` — authenticated persistent cart
5. `005_secure_checkout.sql` — transactional checkout from the authenticated buyer cart

Run migrations in order in the Supabase SQL editor or through your normal Supabase migration workflow.

### Checkout security

The frontend never supplies final prices, sellers, stock or order totals. `create_order_from_cart()` reads the authenticated buyer's cart and current listing rows, locks the listings, validates stock/status, snapshots current prices into `order_items`, decrements stock atomically, creates the order and clears the purchased cart in one database transaction.

The initial delivery implementation uses:

- Pickup: ₦0
- Delivery: ₦2,000

The fee is assigned server-side. It can later be replaced by a location-based delivery service without trusting the browser.
