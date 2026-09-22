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

## Phase 2: Live Leaderboard & Activity Sync

This phase implements:

- **Strava webhook handler** (`/api/webhooks/strava`): `GET` answers the
  one-time `hub.challenge` handshake Strava sends when a push subscription
  is created (see setup below). `POST` receives `activity.create` events,
  acks within Strava's 2-second window, then (via `after()`) fetches the
  full activity, matches it to whichever of the company's active challenges
  covers that activity type/date/department, and inserts it into
  `activities` — idempotently, since Strava can redeliver the same event
  (`lib/strava/webhook-processing.ts`).
- **Public leaderboard** (`/company/[slug]`): individual standings and a
  departmental battle, ranked by whichever metric the active challenge
  uses (distance/time/elevation), with an activity-type filter. "Live"
  here means the client polls `lib/leaderboard-data.ts`'s output every 20s
  via React Query rather than push/WebSockets — enough for a challenge
  leaderboard, and much less infrastructure.

### Registering the Strava webhook subscription

Strava allows exactly **one push subscription per API application** (not
per company) — you create it once, and every connected athlete's activities
flow through it. Do this after deploying, once `STRAVA_WEBHOOK_VERIFY_TOKEN`
is set:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=$NEXT_PUBLIC_APP_URL/api/webhooks/strava \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
```

Strava immediately calls back with a `GET` to `callback_url` carrying
`hub.challenge`; our route answers it automatically, and the command above
returns the new subscription's `id` once that succeeds. To confirm it's
active, or to find its `id` for deletion:

```bash
curl "https://www.strava.com/api/v3/push_subscriptions?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/<id>?client_id=$STRAVA_CLIENT_ID&client_secret=$STRAVA_CLIENT_SECRET"
```

## Phase 3: Google Health (steps) as an alternate data source

Each challenge picks **one** data source at creation and can't change it
afterward:

- **Strava** (default) — ranked by distance/active time/elevation from
  synced Run/Ride/Walk activities, as in Phases 1–2.
- **Google Health** — ranked by total steps. Participants connect their
  Google account (`/api/auth/google-health` →
  `/api/auth/google-health/callback`, mirroring the Strava OAuth flow) and
  their phone's step counter does the rest via the [Google Health
  API](https://developers.google.com/health).

Google Health has no webhook push like Strava's, so step data is pulled
instead:

- `app/api/cron/sync-google-health` — a Vercel Cron job (see `vercel.json`,
  runs every 6 hours) that syncs every connected profile's recent daily
  step totals into `step_entries`.
- A "Sync now" button on the employee dashboard triggers the same pull
  on demand for a single profile, for whenever someone doesn't want to
  wait for the next cron run.

`lib/google-health/` mirrors `lib/strava/`'s shape: `client.ts` (OAuth +
the `dataTypes/steps/dataPoints` fetch), `state.ts` (signed OAuth state),
`tokens.ts` (access token refresh), `sync.ts` (`syncStepsForProfile`).

**Caveats worth knowing before relying on this in production:**

- The Google Health API's exact steps scope string and its
  `dataTypes/steps/dataPoints` request shape are inferred from available
  documentation, not confirmed against a live call — verify both once you
  have real Google Cloud OAuth credentials to test against.
- New Google OAuth clients are capped at **100 test users** until Google
  verifies the app, which likely requires a security review for a
  health-data scope. Budget time for that before a company-wide rollout.

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
   - `STRAVA_WEBHOOK_VERIFY_TOKEN` — a random string you choose
     (`openssl rand -hex 20`); see "Registering the Strava webhook
     subscription" below.
   - (Optional, only needed for Google Health challenges) a Google Cloud
     OAuth 2.0 client's ID/secret as `GOOGLE_HEALTH_CLIENT_ID` /
     `GOOGLE_HEALTH_CLIENT_SECRET`, with redirect URI
     `{NEXT_PUBLIC_APP_URL}/api/auth/google-health/callback`, and a
     `CRON_SECRET` for `/api/cron/sync-google-health` — see "Phase 3" above.
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
- `lib/strava/` — Strava OAuth token exchange, refresh, state encoding, and
  webhook event processing (`webhook-processing.ts`).
- `lib/google-health/` — the Google Health equivalent (OAuth, token refresh,
  daily step sync); no webhook, so `sync.ts` is pulled by a cron instead.
- `lib/leaderboard.ts` / `lib/leaderboard-data.ts` — standings aggregation,
  shared by the leaderboard page (SSR) and its polling API route; branches
  on a challenge's `dataSource` between Strava activities and Google Health
  step entries.
- `app/api/auth/strava/` — the OAuth route handlers.
- `app/api/auth/google-health/` — the Google Health OAuth route handlers.
- `app/api/webhooks/strava/` — the Strava push-subscription webhook.
- `app/api/cron/sync-google-health/` — periodic step sync (Vercel Cron).
- `app/api/company/[slug]/leaderboard/` — public leaderboard data endpoint.
- `app/join/[slug]/` — employee invite landing page.
- `app/company/[slug]/` — public leaderboard page.
- `app/admin/` — HR admin portal (auth, company settings, challenges).
- `components/ui/` — shared UI primitives (shadcn-style, built on Radix).
