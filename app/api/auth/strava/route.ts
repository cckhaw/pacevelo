import { NextResponse, type NextRequest } from "next/server";
import { STRAVA_AUTHORIZE_URL } from "@/lib/strava/client";
import { encodeStravaState } from "@/lib/strava/state";
import { getSession } from "@/lib/session";

/**
 * Step 1 of the Strava OAuth handshake: redirect the browser to Strava's
 * authorize screen. Accepts optional `company` (invite slug) and
 * `redirect_to` query params so the callback can finish onboarding.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Strava OAuth is not configured on this server." },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const companySlug = searchParams.get("company") ?? undefined;
  const redirectTo = searchParams.get("redirect_to") ?? undefined;

  // If the browser already holds a session (e.g. an existing employee
  // reconnecting Strava, or an HR admin linking their own account),
  // attach the new tokens to that profile instead of provisioning a
  // brand new user in the callback.
  const session = await getSession();

  const state = await encodeStravaState({
    companySlug,
    redirectTo,
    existingUserId: session?.userId,
  });

  const redirectUri = `${appUrl}/api/auth/strava/callback`;
  const authorizeUrl = new URL(STRAVA_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  // `activity:read`, not `activity:read_all`: the latter also exposes
  // activities the athlete set to "Only You", and Strava's agreement requires
  // respecting athletes' privacy choices.
  authorizeUrl.searchParams.set("scope", "read,activity:read");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}
