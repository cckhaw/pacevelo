import "server-only";

const STRAVA_OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
const DEFAULT_STRAVA_API_BASE = "https://www.strava.com/api/v3";
export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

export interface StravaAthlete {
  id: number;
  firstname: string | null;
  lastname: string | null;
  profile: string | null;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  expires_in: number;
  token_type: string;
}

export interface StravaTokenExchangeResult extends StravaTokenResponse {
  athlete: StravaAthlete;
}

/**
 * Base URL for Strava's REST API (activity reads). Strava is moving it to
 * https://api-v3.strava.com from 2027-01-04 (that host doesn't exist before
 * then), so it's overridable via STRAVA_API_BASE_URL - the switch becomes an
 * env change once the new host is live. The OAuth URLs are separate and
 * unchanged: Strava hasn't said whether those move.
 */
function stravaApiBase(): string {
  return (process.env.STRAVA_API_BASE_URL?.trim() || DEFAULT_STRAVA_API_BASE).replace(/\/+$/, "");
}

/** A non-2xx response from Strava, keeping the status and body so callers can tell "token revoked" apart from a transient failure. */
export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "StravaApiError";
  }
}

async function stravaApiError(what: string, response: Response): Promise<StravaApiError> {
  const body = await response.text();
  return new StravaApiError(`Strava ${what} failed: ${response.status} ${body}`, response.status, body);
}

function stravaCredentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET env vars");
  }
  return { clientId, clientSecret };
}

/** Exchanges the OAuth `code` from the Strava redirect for tokens + the athlete profile. */
export async function exchangeStravaCode(code: string): Promise<StravaTokenExchangeResult> {
  const { clientId, clientSecret } = stravaCredentials();

  const response = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava token exchange failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/** Revokes PaceVelo's access to this Strava account, so it's free to be connected to a different PaceVelo profile. */
export async function deauthorizeStrava(accessToken: string): Promise<void> {
  const response = await fetch("https://www.strava.com/oauth/deauthorize", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await stravaApiError("deauthorize", response);
  }
}

/** Exchanges a refresh token for a fresh access token (Strava rotates the refresh token too). */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = stravaCredentials();

  const response = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw await stravaApiError("token refresh", response);
  }

  return response.json();
}

export interface StravaActivityDetail {
  id: number;
  type: string; // 'Run', 'Ride', 'Walk', 'Hike', ... (Strava's broader activity type set)
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain: number; // meters
  start_date: string; // ISO 8601
  private?: boolean; // true = "Only You"
  visibility?: string; // 'everyone' | 'followers_only' | 'only_me'
}

/** Fetches full telemetry for a single activity, used after an activity.create webhook event. */
export async function getStravaActivity(
  accessToken: string,
  activityId: number,
): Promise<StravaActivityDetail> {
  const response = await fetch(`${stravaApiBase()}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await stravaApiError("get-activity", response);
  }

  return response.json();
}
