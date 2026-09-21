# PaceVelo

B2B corporate athletic challenge & wellness platform. See `CLAUDE.md` for the
full product brief and data schema.

## Phase 1: Authentication & Onboarding

This phase implements:

- **Strava OAuth** (`/api/auth/strava` → `/api/auth/strava/callback`): connects
  an employee's Strava account, storing `access_token` / `refresh_token` /
  `athlete_id` on their `profiles` row, with automatic token refresh
  (`lib/strava/tokens.ts`) whenever a stored token is expired.
- **Employee join flow** (`/join/[slug]`): a branded landing page per company
  that starts the Strava OAuth handshake and links the new profile to that
  company.
- **HR Admin Portal** (`/admin`): email/password sign-up for HR admins,
  company setup (name, logo, Slack webhook), a "Create Challenge" wizard
  (dates, metric, allowed activities, target departments), and a 1-click
  invite link generator (`app.pacevelo.com/join/<slug>`).

## Getting started

1. Copy `.env.example` to `.env.local` and fill in:
   - A Supabase project's URL, anon key, and **service role** key (used
     server-side only, to provision employee accounts during the Strava
     callback).
   - A Strava API application's client ID/secret
     (https://www.strava.com/settings/api). Set its "Authorization Callback
     Domain" to the host in `NEXT_PUBLIC_APP_URL` (e.g. `localhost` for
     local dev).
2. Run the SQL files in `supabase/migrations/` against your Supabase project,
   in order (via the SQL editor, or `supabase db push` if you use the CLI).
3. `npm install`
4. `npm run dev` and open http://localhost:3000

## Project structure

- `supabase/migrations/` — schema, RLS policies, and storage bucket setup.
- `lib/supabase/` — browser/server/admin Supabase clients + middleware.
- `lib/strava/` — Strava OAuth token exchange, refresh, and state encoding.
- `app/api/auth/strava/` — the OAuth route handlers.
- `app/join/[slug]/` — employee invite landing page.
- `app/admin/` — HR admin portal (auth, company settings, challenges).
- `components/ui/` — shared UI primitives (shadcn-style, built on Radix).
