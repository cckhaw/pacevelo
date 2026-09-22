import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_OAUTH_AUTHORIZE_URL, GOOGLE_HEALTH_SCOPES } from "@/lib/google-health/client";
import { encodeGoogleHealthState } from "@/lib/google-health/state";
import { getSession } from "@/lib/session";

/**
 * Step 1 of the Google Health OAuth handshake: redirect the browser to
 * Google's consent screen. Accepts optional `company` (invite slug) and
 * `redirect_to` query params so the callback can finish onboarding -
 * mirrors app/api/auth/strava/route.ts.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Google Health OAuth is not configured on this server." },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const companySlug = searchParams.get("company") ?? undefined;
  const redirectTo = searchParams.get("redirect_to") ?? undefined;

  // If the browser already holds a session (e.g. an existing employee
  // reconnecting, or an HR admin linking their own account), attach the
  // new tokens to that profile instead of provisioning a brand new user
  // in the callback.
  const session = await getSession();

  const state = await encodeGoogleHealthState({
    companySlug,
    redirectTo,
    existingUserId: session?.userId,
  });

  const redirectUri = `${appUrl}/api/auth/google-health/callback`;
  const authorizeUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("access_type", "offline");
  // Forces Google to hand back a refresh_token even if this account already
  // granted PaceVelo consent previously (Google only issues one on the very
  // first consent otherwise).
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("scope", GOOGLE_HEALTH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}
