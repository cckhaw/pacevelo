import { NextResponse, type NextRequest } from "next/server";
import { exchangeStravaCode } from "@/lib/strava/client";
import { decodeStravaState } from "@/lib/strava/state";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const OAUTH_NONCE_COOKIE = "strava_oauth_nonce";

function errorRedirect(appUrl: string, message: string) {
  const url = new URL("/login", appUrl);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_NONCE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured." }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const stravaError = searchParams.get("error");
  if (stravaError) {
    return errorRedirect(appUrl, "strava_access_denied");
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) {
    return errorRedirect(appUrl, "missing_oauth_params");
  }

  const state = decodeStravaState(rawState);
  const expectedNonce = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;
  if (!state || !expectedNonce || state.nonce !== expectedNonce) {
    return errorRedirect(appUrl, "invalid_oauth_state");
  }

  let exchange;
  try {
    exchange = await exchangeStravaCode(code);
  } catch (err) {
    console.error("Strava token exchange failed", err);
    return errorRedirect(appUrl, "strava_exchange_failed");
  }

  const { athlete, access_token, refresh_token, expires_at } = exchange;
  const tokenFields = {
    strava_athlete_id: athlete.id,
    strava_access_token: access_token,
    strava_refresh_token: refresh_token,
    strava_token_expires_at: new Date(expires_at * 1000).toISOString(),
  };
  const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || "PaceVelo Athlete";

  const admin = createAdminClient();

  let company: { id: string } | null = null;
  if (state.companySlug) {
    const { data } = await admin
      .from("companies")
      .select("id")
      .eq("slug", state.companySlug)
      .maybeSingle();
    company = data;
  }

  const { data: existingAthleteProfile } = await admin
    .from("profiles")
    .select("id, company_id")
    .eq("strava_athlete_id", athlete.id)
    .maybeSingle();

  if (existingAthleteProfile && state.existingUserId && existingAthleteProfile.id !== state.existingUserId) {
    return errorRedirect(appUrl, "strava_account_already_linked");
  }

  let targetUserId: string;
  let isNewUser = false;

  if (state.existingUserId) {
    // Already signed in (e.g. reconnecting, or an HR admin linking Strava) -
    // just attach the tokens to the current session's profile.
    targetUserId = state.existingUserId;
    const { error } = await admin
      .from("profiles")
      .update({
        ...tokenFields,
        ...(company && !(await hasCompany(admin, targetUserId)) ? { company_id: company.id } : {}),
      })
      .eq("id", targetUserId);
    if (error) {
      console.error("Failed to attach Strava tokens to existing profile", error);
      return errorRedirect(appUrl, "profile_update_failed");
    }
  } else if (existingAthleteProfile) {
    // Returning employee (no active session) - refresh tokens, then log them in.
    targetUserId = existingAthleteProfile.id;
    const { error } = await admin
      .from("profiles")
      .update({
        ...tokenFields,
        ...(company && !existingAthleteProfile.company_id ? { company_id: company.id } : {}),
      })
      .eq("id", targetUserId);
    if (error) {
      console.error("Failed to refresh Strava tokens", error);
      return errorRedirect(appUrl, "profile_update_failed");
    }
  } else {
    // Brand new employee joining via an invite link (or direct connect).
    const syntheticEmail = `strava-${athlete.id}@users.pacevelo.app`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        avatar_url: athlete.profile,
        role: "employee",
        strava_athlete_id: athlete.id,
      },
    });
    if (createError || !created.user) {
      console.error("Failed to create Strava-authenticated user", createError);
      return errorRedirect(appUrl, "user_creation_failed");
    }
    targetUserId = created.user.id;
    isNewUser = true;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ ...tokenFields, company_id: company?.id ?? null })
      .eq("id", targetUserId);
    if (updateError) {
      console.error("Failed to save Strava tokens for new profile", updateError);
      return errorRedirect(appUrl, "profile_update_failed");
    }
  }

  const destination = new URL(state.redirectTo ?? "/dashboard", appUrl);

  // If the browser doesn't already have a session for this user, mint one.
  if (!state.existingUserId) {
    const { data: authUser } = await admin.auth.admin.getUserById(targetUserId);
    const email = authUser.user?.email;
    if (!email) {
      return errorRedirect(appUrl, "session_creation_failed");
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !link?.properties?.hashed_token) {
      console.error("Failed to generate sign-in link", linkError);
      return errorRedirect(appUrl, "session_creation_failed");
    }

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
      email,
    });
    if (verifyError) {
      console.error("Failed to establish session after Strava connect", verifyError);
      return errorRedirect(appUrl, "session_creation_failed");
    }
  }

  if (isNewUser) {
    destination.searchParams.set("welcome", "1");
  }
  const response = NextResponse.redirect(destination);
  response.cookies.delete(OAUTH_NONCE_COOKIE);
  return response;
}

async function hasCompany(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return Boolean(data?.company_id);
}
