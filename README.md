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
  is created (see setup below). `POST` acks within Strava's 2-second window,
  then (via `after()`) handles, all in `lib/strava/webhook-processing.ts`:
  - `activity` **create / update** — fetches the current activity and
    reconciles it against every challenge the athlete joined: upserts it,
    credits the ones it qualifies for, and drops credits from still-open
    challenges it no longer qualifies for (e.g. its type was edited).
    Deactivated or ended challenges are never rewritten by a later edit.
    Idempotent, since Strava can redeliver the same event.
  - `activity` **delete** — removes it. Strava also sends this when an
    activity is made private ("Only You"), and a create again if it's made
    visible.
  - `athlete` **update** with `authorized: "false"` — the athlete revoked
    PaceVelo in Strava's settings; their tokens and athlete id are cleared.
    Their already-synced activities stay (so reconnecting mid-challenge costs
    no progress) until the retention purge below deletes them. Every path
    that ends a connection — this event, a rejected refresh token,
    disconnecting, the stale cleanup — goes through `clearStravaConnection`.
  - Activities Strava marks "Only You" are never stored: we request only the
    `activity:read` scope, and still drop them for athletes who connected
    earlier with the broader `activity:read_all` scope.

  Strava doesn't sign these payloads, so set `STRAVA_WEBHOOK_SUBSCRIPTION_ID`
  (below) to reject events from any other subscription.
- **Connection hygiene**, so athletes who are gone don't count against
  Strava's connected-athlete capacity:
  - A refresh token Strava rejects (athlete revoked access) clears the stored
    connection (`lib/strava/tokens.ts`). The dashboard reads connection state
    from our own records and makes no Strava call on page view.
  - Disconnecting (self-serve or from the back office) **and deleting a user**
    revoke PaceVelo on Strava's side too (`lib/strava/connection.ts`).
  - `/api/cron/cleanup-strava` (daily, `vercel.json`) does two things. It
    **deletes synced Strava activities** once `STRAVA_DATA_RETENTION_DAYS`
    days (default 30) have passed since the last challenge crediting them
    ended (`lib/strava/retention.ts`; the privacy policy and consent notice
    read the same setting). And it **revokes athletes** whose latest challenge
    ended more than `STRAVA_STALE_AFTER_DAYS` days ago (default 7), or who
    never joined one. It **requires `CRON_SECRET`**. `?dryRun=1` previews both
    without changing anything (`&days=N` / `&retentionDays=N` try other
    values). A failed Strava call leaves the connection in place for the next
    run to retry.
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
returns the new subscription's `id` once that succeeds. Set that `id` as
`STRAVA_WEBHOOK_SUBSCRIPTION_ID` so events from any other subscription are
rejected. To confirm it's active, or to find its `id` for deletion:

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
  runs once daily at 03:00 UTC) that syncs every connected profile's recent
  daily step totals into `step_entries`. Vercel's Hobby plan caps cron jobs
  at once per day — a more frequent schedule fails at deploy time, and
  Vercel only reads `vercel.json`'s `schedule` as a static string, not from
  an env var, so there's no way to make the interval itself
  env-configurable. To sync more often after upgrading to Pro, edit the
  `schedule` cron expression in `vercel.json` directly and redeploy.
- A "Sync now" button on the employee dashboard triggers the same pull
  on demand for a single profile, for whenever someone doesn't want to
  wait for the next cron run.

`lib/google-health/` mirrors `lib/strava/`'s shape: `client.ts` (OAuth +
the `dataTypes/steps/dataPoints` fetch), `state.ts` (signed OAuth state),
`tokens.ts` (access token refresh), `sync.ts` (`syncStepsForProfile`).

**Caveats worth knowing before relying on this in production:**

- The OAuth scope, filter syntax, and response shape for
  `dataTypes/steps/dataPoints` are now confirmed against a real successful
  sync. The filter is `steps.interval.start_time >= "..." AND
  steps.interval.start_time < "..."` (steps only supports filtering on
  `start_time`, not `end_time`; only `>=`/`<` are supported, not `<=`).
  Each data point nests its value and interval under a `steps` key (not
  generic top-level `value`/`interval` fields as a first guess assumed),
  and carries a `civilStartTime` with the athlete's own local calendar
  date, which `getDailySteps` uses for day-bucketing instead of a UTC cut.
- New Google OAuth clients are capped at **100 test users** until Google
  verifies the app, which likely requires a security review for a
  health-data scope. Budget time for that before a company-wide rollout.

## Phase 4: Contact form, gated onboarding, and a single login screen

- **Public contact form** (`/contact`): name/email/phone/message, guarded by
  a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
  captcha (`components/turnstile-widget.tsx`, verified server-side in
  `lib/turnstile.ts`), emailed to PaceVelo's own inbox
  (`lib/email.ts#sendContactEnquiryEmail`, hardcoded to `me@khaw.cc` - not
  company-configurable, since this is PaceVelo's own enquiry line, not a
  per-company feature). Linked from the homepage's "Contact Us" button.
- **Onboarding code gate** (`/admin/signup`): a two-step flow - the
  onboarding code is checked first (`verifyOnboardingCode` in
  `app/admin/auth-actions.ts`), and the rest of the sign-up form (name,
  email, password) only renders once it's valid. An invalid/missing code
  points to `/contact` instead of letting someone fill in account details
  they can't actually use. The code carries through to `/admin/company` (as
  a `?code=` query param, pre-filling that step's own field) where it's
  re-validated and actually consumed, same as before this change.
- **Single login screen** (`/login`): employees and HR admins sign in from
  the same form; `signIn` (`app/login/actions.ts`) already redirected by
  role, so the separate `/admin/login` page/action were redundant and are
  gone (old links to `/admin/login` get a permanent redirect to `/login`
  via `next.config.ts`).

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
   - A Cloudflare Turnstile widget's Site Key/Secret Key as
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`, for the
     `/contact` form's captcha — see "Phase 4" above. Without these the
     form still renders but shows "Captcha isn't configured" instead of the
     widget, and submissions are rejected server-side.
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
