# Atomos

Atomos is a mobile-first Nigerian marketplace application built with React, TypeScript, Vite and Supabase.

## Repository layout

```text
atomos/
├── frontend/                 # React/Vite application
│   ├── public/
│   └── src/
│       ├── components/       # reusable UI grouped by responsibility
│       ├── contexts/         # React providers
│       ├── data/             # local/demo catalogue data
│       ├── hooks/             # reusable React hooks
│       ├── lib/              # Supabase client and low-level helpers
│       ├── pages/             # route-level screens grouped by area
│       ├── routes/            # route definitions
│       ├── services/          # Supabase application services
│       ├── types/             # domain types
│       └── App.tsx
├── backend/
│   └── supabase/migrations/  # Postgres schema, RLS and RPC migrations
├── docs/                     # project documentation
└── ARCHITECTURE.md
```

Supabase is the backend for the current application. The repository intentionally does not contain empty Express controllers/models/repositories just to mirror a generic Node architecture.

## Current implementation

- Supabase authentication and protected routes
- Seller onboarding/role protection
- Seller listing creation and management
- Seller-uploaded multi-photo listings
- Live listing discovery/search and filters
- Infinite loading
- Persistent Supabase cart
- Add, stock-aware quantity +/−, remove and Clear cart
- Consolidated database migrations and RLS hardening

Secure checkout, order creation and payment integration are intentionally the next implementation phase. No fake payment flow is included.

## Setup

1. Install Node.js.
2. From the repository root, run `npm install`.
3. Copy `frontend/.env.example` to `frontend/.env.local` and add the Supabase project URL and publishable key.
4. Apply the Supabase migrations in `backend/supabase/migrations/` in numeric order for a fresh project.
5. Run `npm run dev`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

See `ARCHITECTURE.md` for the architectural decisions behind the structure.

## Section 2.4.2 — Secure Checkout

Checkout now creates orders from the authenticated user's persisted cart through a transactional Supabase RPC. The database re-checks listing status, current price and stock, snapshots order items, reduces stock atomically and clears the purchased cart. See `SECTION-2-4-2-CHECKOUT.md` and run `backend/supabase/migrations/005_secure_checkout.sql`.
