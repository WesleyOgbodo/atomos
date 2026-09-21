# Section 2.4.3 — Orders & Order Management

Implemented on top of Section 2.4.2 secure checkout.

## Buyer

- `/orders` lists authenticated buyer orders.
- `/orders/:orderId` shows order reference, items, quantities, unit prices, totals, fulfilment method/address, status timeline, and cancellation when the order is still `pending`.
- Buyer order reads are protected by Supabase RLS.
- Buyer cancellation is handled by `cancel_my_order(uuid)` and restores reserved stock.

## Seller

- `/seller/orders` is restricted to active seller accounts.
- Sellers receive only orders containing their own listings through `get_seller_orders()`.
- Seller status changes go through `seller_update_order_status(uuid, order_status)`.
- Allowed progression is:
  `pending → confirmed → processing → ready_for_delivery → delivered`
- Seller cancellation is permitted only from `pending` or `confirmed`.
- A seller cannot change an order-level status when the order contains another seller's items. This prevents one seller from changing another seller's fulfilment state. Per-seller fulfilment status can be introduced later if Atomos moves to independently fulfilled multi-seller orders.

## Security

- Direct buyer/seller order status updates are not exposed to the client.
- Prices, totals and quantities remain immutable after checkout.
- Buyer and seller state changes are validated in PostgreSQL functions.
- Seller contact/order data is returned by a server-side ownership-checked RPC.
- Human-readable `order_number` references are generated and unique.

## Supabase migration

Run:

`backend/supabase/migrations/006_orders_management.sql`

after `005_secure_checkout.sql`.

## Payment

Payment is intentionally not part of this section. Paystack/Flutterwave integration remains a separate phase so order creation and fulfilment can be verified before payment webhooks are introduced.
