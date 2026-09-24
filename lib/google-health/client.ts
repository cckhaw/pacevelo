import "server-only";

// Google's OAuth2 endpoints are shared across all Google APIs (not specific
// to Health), so these are stable regardless of which product you're calling.
export const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// The Google Health API (successor to Google Fit / the legacy Fitbit Web
// API - see https://developers.google.com/health). Read access to daily
// step counts.
const GOOGLE_HEALTH_API_BASE = "https://health.googleapis.com/v4";

// googlehealth.activity_and_fitness.readonly covers activity/fitness data
// broadly (steps included) - there's no narrower steps-only scope.
export const GOOGLE_HEALTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
];

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  id_token?: string;
  token_type: string;
  scope: string;
}

export interface GoogleHealthTokenExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  googleUserId: string;
}

function googleHealthCredentials() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_HEALTH_CLIENT_ID / GOOGLE_HEALTH_CLIENT_SECRET env vars");
  }
  return { clientId, clientSecret };
}

/** Decodes the `sub` claim from a Google-issued ID token without verifying its signature - safe here since it came directly from Google's token endpoint over a server-to-server HTTPS call, not from the client. */
function decodeGoogleSub(idToken: string): string {
  const payloadSegment = idToken.split(".")[1];
  if (!payloadSegment) throw new Error("Malformed Google ID token");
  const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
  if (typeof payload.sub !== "string") throw new Error("Google ID token missing sub claim");
  return payload.sub;
}

/** Exchanges the OAuth `code` from Google's redirect for tokens + the account's stable subject id. */
export async function exchangeGoogleHealthCode(
  code: string,
  redirectUri: string,
): Promise<GoogleHealthTokenExchangeResult> {
  const { clientId, clientSecret } = googleHealthCredentials();

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Health token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data: GoogleTokenResponse = await response.json();
  if (!data.refresh_token || !data.id_token) {
    throw new Error("Google did not return a refresh_token/id_token - ensure access_type=offline and the openid scope were requested");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    googleUserId: decodeGoogleSub(data.id_token),
  };
}

/** Exchanges a refresh token for a fresh access token. Google does not rotate the refresh token on each use. */
export async function refreshGoogleHealthToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const { clientId, clientSecret } = googleHealthCredentials();

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Health token refresh failed: ${response.status} ${await response.text()}`);
  }

  const data: GoogleTokenResponse = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/** Revokes PaceVelo's access to this Google account, so it's free to be connected to a different PaceVelo profile. */
export async function revokeGoogleHealthToken(token: string): Promise<void> {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Google token revoke failed: ${response.status} ${await response.text()}`);
  }
}

// Confirmed against Google's own API discovery document
// (health.googleapis.com/$discovery/rest?version=v4 - developers.google.com
// itself is blocked in this environment's egress policy, but the discovery
// doc is served from the API host and isn't). Summing raw dataPoints
// (dataPoints.list) double-counts when an athlete has more than one
// connected source reporting steps for the same day (e.g. a phone's own
// step counter and a paired watch app both syncing to Google Health/Health
// Connect) - dataPoints.list has no way to filter or dedupe by source. The
// dailyRollUp endpoint is Google's dedicated fix for exactly this: its
// response is explicitly documented as data "reconciled" across all of the
// athlete's data sources into one authoritative total per civil day, so
// this app doesn't need to (and structurally can't, from the list endpoint
// alone) dedupe overlapping-but-not-identical points across sources itself.
interface GoogleHealthCivilDate {
  year: number;
  month: number;
  day: number;
}

interface GoogleHealthDailyRollupDataPoint {
  civilStartTime?: { date: GoogleHealthCivilDate };
  steps?: { stepsSum?: string };
}

interface GoogleHealthDailyRollUpResponse {
  rollupDataPoints?: GoogleHealthDailyRollupDataPoint[];
}

export interface DailyStepsResult {
  byDay: Map<string, number>;
  // Diagnostics surfaced on "Sync now" (see SyncGoogleHealthButton) - lets
  // a 0-day sync be told apart from "Google returned no rollup data at
  // all" vs. "rollup buckets came back but none had a readable step sum".
  rollupBucketCount: number;
  sampleRollupPoint: GoogleHealthDailyRollupDataPoint | null;
}

function civilDateOf(d: Date): GoogleHealthCivilDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Fetches one reconciled step total per civil day between `startTime` and
 * `endTime` via Google's dailyRollUp endpoint, rather than summing raw
 * dataPoints client-side (see comment above). Returns a map of day
 * ("YYYY-MM-DD") -> steps, plus response diagnostics (see DailyStepsResult).
 */
export async function getDailySteps(
  accessToken: string,
  startTime: Date,
  endTime: Date,
): Promise<DailyStepsResult> {
  const byDay = new Map<string, number>();

  // range is a closed-open [start, end) range of civil dates, so the end
  // bound is pushed one day past endTime's own calendar day - otherwise
  // "today" (endTime's day, usually still in progress) would be excluded
  // entirely instead of returning its steps-so-far.
  const rangeEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);

  const response = await fetch(`${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/steps/dataPoints:dailyRollUp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: {
        start: { date: civilDateOf(startTime) },
        end: { date: civilDateOf(rangeEnd) },
      },
      windowSizeDays: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Health steps rollup fetch failed: ${response.status} ${await response.text()}`);
  }

  const data: GoogleHealthDailyRollUpResponse = await response.json();
  const rollupDataPoints = data.rollupDataPoints ?? [];
  let sampleRollupPoint: GoogleHealthDailyRollupDataPoint | null = null;

  for (const point of rollupDataPoints) {
    if (!sampleRollupPoint) sampleRollupPoint = point;
    const stepsSum = Number(point.steps?.stepsSum ?? 0);
    if (!stepsSum) continue;

    const civilDate = point.civilStartTime?.date;
    if (!civilDate) continue;
    const day = `${civilDate.year}-${String(civilDate.month).padStart(2, "0")}-${String(civilDate.day).padStart(2, "0")}`;
    // windowSizeDays: 1 means dailyRollUp returns at most one bucket per
    // civil day, so this is a direct set (not an accumulating sum) -
    // Google's own reconciled total for that day, not a partial to add to.
    byDay.set(day, stepsSum);
  }

  return { byDay, rollupBucketCount: rollupDataPoints.length, sampleRollupPoint };
}
