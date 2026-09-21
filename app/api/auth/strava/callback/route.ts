import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { exchangeStravaCode } from "@/lib/strava/client";
import { decodeStravaState } from "@/lib/strava/state";
import { createSession } from "@/lib/session";
import { db } from "@/db";
import { companies, profiles } from "@/db/schema";

function errorRedirect(appUrl: string, message: string) {
  const url = new URL("/login", appUrl);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
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

  const state = await decodeStravaState(rawState);
  if (!state) {
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
    stravaAthleteId: athlete.id,
    stravaAccessToken: access_token,
    stravaRefreshToken: refresh_token,
    stravaTokenExpiresAt: new Date(expires_at * 1000),
  };
  const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || "PaceVelo Athlete";

  let company: { id: string } | null = null;
  if (state.companySlug) {
    company = (await db.query.companies.findFirst({
      where: eq(companies.slug, state.companySlug),
      columns: { id: true },
    })) ?? null;
  }

  const existingAthleteProfile = await db.query.profiles.findFirst({
    where: eq(profiles.stravaAthleteId, athlete.id),
    columns: { id: true, companyId: true, role: true },
  });

  if (existingAthleteProfile && state.existingUserId && existingAthleteProfile.id !== state.existingUserId) {
    return errorRedirect(appUrl, "strava_account_already_linked");
  }

  let targetUserId: string;
  let targetRole: "employee" | "admin" = "employee";
  let isNewUser = false;

  try {
    if (state.existingUserId) {
      // Already signed in (e.g. reconnecting, or an HR admin linking Strava) -
      // just attach the tokens to the current session's profile.
      targetUserId = state.existingUserId;
      const currentProfile = await db.query.profiles.findFirst({
        where: eq(profiles.id, targetUserId),
        columns: { companyId: true, role: true },
      });
      if (!currentProfile) {
        return errorRedirect(appUrl, "profile_update_failed");
      }
      targetRole = currentProfile.role;

      await db
        .update(profiles)
        .set({
          ...tokenFields,
          ...(company && !currentProfile.companyId ? { companyId: company.id } : {}),
        })
        .where(eq(profiles.id, targetUserId));
    } else if (existingAthleteProfile) {
      // Returning employee (no active session) - refresh tokens, then log them in.
      targetUserId = existingAthleteProfile.id;
      targetRole = existingAthleteProfile.role;

      await db
        .update(profiles)
        .set({
          ...tokenFields,
          ...(company && !existingAthleteProfile.companyId ? { companyId: company.id } : {}),
        })
        .where(eq(profiles.id, targetUserId));
    } else {
      // Brand new employee joining via an invite link (or direct connect).
      const syntheticEmail = `strava-${athlete.id}@users.pacevelo.app`;
      const [created] = await db
        .insert(profiles)
        .values({
          email: syntheticEmail,
          fullName,
          avatarUrl: athlete.profile,
          role: "employee",
          companyId: company?.id ?? null,
          ...tokenFields,
        })
        .returning({ id: profiles.id });

      targetUserId = created.id;
      isNewUser = true;
    }
  } catch (err) {
    console.error("Failed to save Strava connection", err);
    return errorRedirect(appUrl, "profile_update_failed");
  }

  // Mint a session unless the browser already had one for this user.
  if (!state.existingUserId) {
    await createSession({ userId: targetUserId, role: targetRole });
  }

  const destination = new URL(state.redirectTo ?? "/dashboard", appUrl);
  if (isNewUser) {
    destination.searchParams.set("welcome", "1");
  }
  return NextResponse.redirect(destination);
}
