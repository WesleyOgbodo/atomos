# Atomos setup

## Local frontend

From the repository root:

```bash
npm install
npm run dev
```

The Vite application lives in `frontend/`.

## Environment

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Only the publishable/anon client key belongs in the browser. Never place a service-role/secret key in the frontend.

## Supabase

For a fresh database, apply the migrations under `backend/supabase/migrations/` in numeric order. For an existing database, only apply migrations that have not already been applied.
