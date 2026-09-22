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

interface GoogleHealthDataPoint {
  interval: { startTime: string; endTime: string };
  value?: { count?: string };
}

interface GoogleHealthDataPointsResponse {
  dataPoints?: GoogleHealthDataPoint[];
  nextPageToken?: string;
}

/**
 * Fetches raw step data points between `startTime` and `endTime` and sums
 * them per UTC calendar day. Returns a map of day (UTC midnight) -> steps.
 */
export async function getDailySteps(
  accessToken: string,
  startTime: Date,
  endTime: Date,
): Promise<Map<string, number>> {
  const byDay = new Map<string, number>();
  let pageToken: string | undefined;

  do {
    // Per Google's REST reference (users.dataTypes.dataPoints.list), the
    // filter must reference fields as "{data_type}.interval.start_time" /
    // "{data_type}.interval.end_time" - the data type name (here "steps",
    // matching the dataTypes/steps path segment below) is a required
    // prefix, and only >= and < are supported (not <=).
    const params = new URLSearchParams({
      page_size: "1000",
      filter: `steps.interval.start_time >= "${startTime.toISOString()}" AND steps.interval.end_time < "${endTime.toISOString()}"`,
    });
    if (pageToken) params.set("page_token", pageToken);

    const response = await fetch(`${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/steps/dataPoints?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Google Health steps fetch failed: ${response.status} ${await response.text()}`);
    }

    const data: GoogleHealthDataPointsResponse = await response.json();
    for (const point of data.dataPoints ?? []) {
      const count = Number(point.value?.count ?? 0);
      if (!count) continue;
      const day = point.interval.startTime.slice(0, 10); // UTC calendar day, YYYY-MM-DD
      byDay.set(day, (byDay.get(day) ?? 0) + count);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return byDay;
}
