# Atomos — Section 2.4.4 Payment Integration

## Current status

Paystack test-mode payment flow has been tested successfully end-to-end.

1. Buyer creates an order through the secure checkout RPC.
2. Frontend invokes `paystack-initialize` with only the order ID.
3. The Edge Function obtains the server-trusted order amount/email.
4. Paystack is initialized using the server-side secret key.
5. Paystack redirects to `/payment/callback?reference=...`.
6. Vercel rewrites the callback path to the SPA entry point.
7. `paystack-verify` authenticates the buyer and verifies the transaction directly with Paystack.
8. PostgreSQL validates currency and Paystack `requested_amount` against the Atomos order total.
9. A successful transaction marks the payment as paid and a pending order as confirmed.
10. `charge.success` webhooks provide an independent server-to-server confirmation path and are HMAC-SHA512 verified.

## Important security fixes

- The browser never receives `PAYSTACK_SECRET_KEY`.
- The payment-recording RPC is not executable by browser clients.
- Payment references are checked against the authenticated buyer's order.
- Paystack's `requested_amount` is compared with the server-side order total.
- The webhook verifies the transaction with Paystack instead of trusting event payload amounts blindly.
- Payment recording is idempotent.

## Supabase deployment

CLI-facing Edge Functions are mirrored under `supabase/functions/` so `supabase functions deploy <name>` works from the repository root. The original source remains under `backend/supabase/functions/`.

## Paystack callback

The callback URL is configured through `PAYSTACK_CALLBACK_URL` and should point to the deployed Vercel route:

`https://atomos-six.vercel.app/payment/callback`

The Paystack webhook endpoint is:

`https://xjeitnmwoxvzuaqzuptw.supabase.co/functions/v1/paystack-webhook`

Never commit actual secret values.
