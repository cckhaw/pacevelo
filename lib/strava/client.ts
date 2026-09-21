import "server-only";

const STRAVA_OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
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
    throw new Error(`Strava token refresh failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
