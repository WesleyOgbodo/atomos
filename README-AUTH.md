# Atomos Authentication — Section 2.2

This frontend now includes the first Supabase Auth integration:

- Email/password registration
- Email confirmation flow
- Email/password sign-in
- Password reset request
- Password update after reset
- Persistent Supabase session handling
- Protected account/cart/messages/wishlist routes
- Profile loading from `public.profiles`
- Sign out
- New accounts remain `buyer` by default

## Environment

Create `frontend/.env.local` inside the frontend directory:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Never put a Supabase secret/service-role key in this frontend.

## Supabase dashboard settings

Authentication → Providers → Email:
- Email provider enabled
- Confirm email enabled

Authentication → URL Configuration:
- Site URL: `http://localhost:5173`
- Redirect URL: `http://localhost:5173/**`

## Run

```bash
npm install
npm run dev
```

The next backend work should wire seller onboarding, listing creation, Storage, and real database listings. Do not treat the current local catalogue as the production source of truth yet.
