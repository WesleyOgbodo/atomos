# Atomos Architecture

Atomos is currently a React/Vite frontend backed directly by Supabase (Postgres, Auth, Storage and RLS).

## Structure

- `frontend/` — React/Vite application
- `frontend/frontend/src/components/` — reusable UI grouped by responsibility
- `frontend/frontend/src/pages/` — route-level screens grouped by product area
- `frontend/src/hooks/` — reusable React hooks
- `frontend/frontend/src/services/` — Supabase-facing application services
- `frontend/src/lib/` — low-level clients and formatting helpers
- `frontend/src/contexts/` — React context providers
- `frontend/src/routes/` — application route definitions
- `frontend/src/types/` — frontend domain types
- `backend/supabase/` — database migrations and Supabase backend configuration

## Backend decision

There is intentionally no empty Express `controllers/`, `models/`, `repositories/`, or `server.ts` layer. Those folders would add ceremony without adding functionality while Atomos uses Supabase as its backend. Trusted database operations belong in Postgres functions/RPCs and RLS policies; external payment webhooks can later be handled by an edge/server function when payment integration is introduced.

## Commands

From the repository root:

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm run lint`

The frontend can also be run directly from `frontend/` with the same commands.
