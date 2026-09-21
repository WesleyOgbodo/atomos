# Atomos — Current Project Status

Baseline: refactored React/Vite + Supabase marketplace.

## Completed

- Marketplace storefront, search and listing details
- Supabase authentication/profile foundation
- Seller listing management and listing photos
- Cart persistence, quantity controls, stock validation and secure cart RPCs
- Secure server-side checkout/order creation
- Buyer orders and order details
- Seller orders and server-side status transitions
- Buyer/seller cancellation flows with stock restoration where permitted
- Paystack test-mode initialization, callback and server-side verification
- Paystack HMAC-SHA512 webhook verification
- Payment idempotency and order confirmation
- Paystack callback SPA routing through Vercel rewrite
- Seller-order RLS recursion fix through `is_order_seller(uuid)`
- Payment amount verification corrected to use Paystack `requested_amount`
- Type-safe Paystack verification/webhook payloads (no `any`)

## Production/test configuration

Frontend uses:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase Edge Functions use server-side secrets:
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL`
- Supabase publishable/secret key environment values supplied by the platform

Never put Paystack secret keys or Supabase secret/service-role keys in Vite variables.

## Next planned phase

Section 2.4.5: seller order operations/notifications hardening, followed by marketplace messaging, reviews, wishlist persistence, admin moderation, anti-scam protections, testing and deployment hardening.
