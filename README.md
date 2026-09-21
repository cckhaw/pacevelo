# PaceVelo

B2B corporate athletic challenge & wellness platform. See `CLAUDE.md` for the
full product brief and data schema.

## Stack

- **Framework:** Next.js (App Router, Server Actions, TypeScript, Tailwind)
- **Database:** [Neon](https://neon.tech) serverless Postgres, via
  [Drizzle ORM](https://orm.drizzle.team) (`db/schema.ts`)
- **Auth:** custom — httpOnly JWT session cookies (`jose`) + bcrypt for HR
  admin passwords. Authorization is enforced in application code
  (`requireAdmin()` / `getSession()`), not database RLS.
- **File storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
  (company logo uploads)
- **State/data fetching:** TanStack React Query v5

## Phase 1: Authentication & Onboarding

This phase implements:

- **Strava OAuth** (`/api/auth/strava` → `/api/auth/strava/callback`): connects
  an employee's Strava account, storing `access_token` / `refresh_token` /
  `athlete_id` on their `profiles` row, with automatic token refresh
  (`lib/strava/tokens.ts`) whenever a stored token is expired. A brand-new
  employee gets a `profiles` row provisioned on the spot and a session
  cookie issued directly — no separate identity provider involved.
- **Employee join flow** (`/join/[slug]`): a branded landing page per company
  that starts the Strava OAuth handshake and links the new profile to that
  company.
- **HR Admin Portal** (`/admin`): email/password sign-up for HR admins,
  company setup (name, logo, Slack webhook), a "Create Challenge" wizard
  (dates, metric, allowed activities, target departments), and a 1-click
  invite link generator (`app.pacevelo.com/join/<slug>`).

## Getting started

1. **Create a Neon database.** Either via [neon.tech](https://neon.tech)
   directly, or from the Vercel dashboard: Project → Storage → Create
   Database → Neon. Copy the pooled connection string.
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — the Neon connection string.
   - `SESSION_SECRET` — a random 32+ char string (`openssl rand -base64 32`).
   - `BLOB_READ_WRITE_TOKEN` — from a Vercel Blob store connected to the
     project (Project Settings → Storage).
   - A Strava API application's client ID/secret
     (https://www.strava.com/settings/api). Set its "Authorization Callback
     Domain" to the host in `NEXT_PUBLIC_APP_URL` (e.g. `localhost` for
     local dev).
3. Run the schema migration against your Neon database:
   ```bash
   npm run db:migrate
   ```
   (`npm run db:generate` regenerates `db/migrations/*.sql` after changing
   `db/schema.ts`; `npm run db:studio` opens Drizzle Studio to browse data.)
4. `npm install`
5. `npm run dev` and open http://localhost:3000

## Project structure

- `db/schema.ts` — Drizzle schema (companies/profiles/challenges/activities).
- `db/migrations/` — generated SQL migrations, run with `npm run db:migrate`.
- `lib/session.ts` / `lib/password.ts` — session cookie (JWT) + password hashing.
- `lib/auth.ts` — `requireAdmin()` page guard used by every `/admin` route.
- `lib/strava/` — Strava OAuth token exchange, refresh, and state encoding.
- `app/api/auth/strava/` — the OAuth route handlers.
- `app/join/[slug]/` — employee invite landing page.
- `app/admin/` — HR admin portal (auth, company settings, challenges).
- `components/ui/` — shared UI primitives (shadcn-style, built on Radix).
