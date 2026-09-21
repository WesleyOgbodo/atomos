# Atomos — Updated Project Archive

This archive is reconstructed from the latest local project artifacts available in the workspace plus the fixes confirmed during the Atomos build conversation.

## Included confirmed fixes

### Foundation
- Refactored React/Vite/TypeScript frontend with Supabase integration.
- Marketplace storefront, product/listing pages, search and infinite listing UI.
- Authentication and protected routes.
- Seller listing management and listing photos.

### Section 2.4.1 — Cart
- Persistent Supabase cart.
- Add/remove/update quantity.
- Stock-aware quantity limits.
- Archived/sold/removed/zero-stock handling.
- Fixed ambiguous `cart_id` RPC errors.
- Fixed cart-items RLS errors.
- Fixed ambiguous cart ID in quantity RPC.
- Clear-cart flow.

### Section 2.4.2 — Secure checkout
- Server-side order creation from cart.
- Server-trusted pricing/stock.
- Pickup and delivery fulfilment.
- Delivery fee represented in the secure checkout flow.
- Client values are display-only and are not trusted for final order totals.

### Section 2.4.3 — Orders
- Buyer order list and order details.
- Human-readable `ATM-...` order references.
- Order status timeline.
- Buyer cancellation where permitted.
- Seller order list/details.
- Seller status progression.
- Seller cancellation where permitted.
- Stock restoration on permitted cancellation.
- Fixed order-details HTTP 500 caused by recursive seller order RLS evaluation.
- Added `is_order_seller(uuid)` security-definer helper for seller order visibility.

### Section 2.4.4 — Paystack payments
- Paystack server-side transaction initialization.
- Paystack callback route.
- Vercel SPA rewrite fixing `/payment/callback` 404.
- Server-side transaction verification.
- Buyer ownership check for payment reference.
- Server-only payment-recording RPC.
- Paystack HMAC-SHA512 webhook validation.
- Idempotent payment confirmation.
- Successful payment transitions pending order to confirmed.
- Fixed callback verification failure caused by Paystack `amount` including an additional charge while Atomos requested the order total.
- Payment verification now compares Atomos total against Paystack `requested_amount`.
- Verify/webhook payloads are typed; no `any` in those functions.
- CLI-facing `supabase/functions` mirror included for deployment from repository root.

## Important environment values

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase Edge Functions:
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL`
- platform-provided Supabase publishable/secret key environment values

No actual secret values are included in this archive.

## Deployment notes

- Supabase project ref: `xjeitnmwoxvzuaqzuptw`
- Vercel deployment used the `frontend` directory.
- SPA callback rewrite is in `frontend/vercel.json`.
- Paystack webhook endpoint:
  `https://xjeitnmwoxvzuaqzuptw.supabase.co/functions/v1/paystack-webhook`
- Callback route:
  `https://atomos-six.vercel.app/payment/callback`

## Current next phase

Section 2.4.5 should focus on seller order operations hardening/notifications and then continue through messaging, reviews, wishlist persistence, admin moderation, anti-scam controls, automated tests and production hardening.
