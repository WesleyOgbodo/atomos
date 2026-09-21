# Atomos Section 2.4.2 — Secure Checkout

Implemented:

- `/checkout` checkout page
- Pickup or delivery selection
- Server-controlled delivery fee
- Delivery address validation
- Current cart review
- Server-side current price and stock validation
- Atomic order creation
- Order item price/title/seller snapshots
- Atomic stock reduction
- Automatic cart cleanup after successful checkout
- `/orders` buyer order history
- `/orders/:orderId` order details
- Authenticated buyer-only order reads
- Payment intentionally not included yet

## Supabase step

Run `backend/supabase/migrations/005_secure_checkout.sql` after migrations 001–004.

## Delivery fee

The initial server rule is ₦2,000 for delivery and ₦0 for pickup. This is deliberately centralized in the database transaction so a browser request cannot change the fee.

## Testing checklist

1. Add an active listing to a buyer cart.
2. Open `/checkout`.
3. Confirm pickup total has no delivery fee.
4. Select delivery and enter an address.
5. Confirm the delivery fee is shown.
6. Place the order.
7. Confirm the cart is cleared.
8. Confirm stock decreases by the ordered quantity.
9. Confirm the listing becomes `sold` when stock reaches zero.
10. Confirm the order appears under `/orders`.
11. Open the order detail page.
12. Attempt checkout after another buyer consumes the remaining stock; the transaction should reject the order without partially changing stock or creating a lasting order.
13. Change a listing's price after it is in a cart and confirm checkout uses the current database price.
