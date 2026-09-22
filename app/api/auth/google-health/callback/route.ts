import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { exchangeGoogleHealthCode } from "@/lib/google-health/client";
import { decodeGoogleHealthState } from "@/lib/google-health/state";
import { createSession } from "@/lib/session";
import { checkEmployeeLimit } from "@/lib/company-limits";
import { db } from "@/db";
import { companies, profiles } from "@/db/schema";

function errorRedirect(appUrl: string, message: string, hint?: string) {
  const url = new URL("/login", appUrl);
  url.searchParams.set("error", message);
  if (hint) url.searchParams.set("hint", hint);
  return NextResponse.redirect(url);
}

/** Masks an email for display in an error message - safe here since seeing it requires already having OAuth-authorized the conflicting Google account. */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 1))}@${domain}`;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured." }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const googleError = searchParams.get("error");
  if (googleError) {
    return errorRedirect(appUrl, "google_health_access_denied");
  }

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  if (!code || !rawState) {
    return errorRedirect(appUrl, "missing_oauth_params");
  }

  const state = await decodeGoogleHealthState(rawState);
  if (!state) {
    return errorRedirect(appUrl, "invalid_oauth_state");
  }

  let exchange;
  try {
    const redirectUri = `${appUrl}/api/auth/google-health/callback`;
    exchange = await exchangeGoogleHealthCode(code, redirectUri);
  } catch (err) {
    console.error("Google Health token exchange failed", err);
    return errorRedirect(appUrl, "google_health_exchange_failed");
  }

  const { googleUserId, accessToken, refreshToken, expiresAt } = exchange;
  const tokenFields = {
    googleHealthUserId: googleUserId,
    googleHealthAccessToken: accessToken,
    googleHealthRefreshToken: refreshToken,
    googleHealthTokenExpiresAt: expiresAt,
  };

  let company: { id: string } | null = null;
  if (state.companySlug) {
    company = (await db.query.companies.findFirst({
      where: eq(companies.slug, state.companySlug),
      columns: { id: true },
    })) ?? null;
  }

  const existingGoogleProfile = await db.query.profiles.findFirst({
    where: eq(profiles.googleHealthUserId, googleUserId),
    columns: { id: true, companyId: true, role: true, email: true, passwordHash: true },
  });

  if (existingGoogleProfile && state.existingUserId && existingGoogleProfile.id !== state.existingUserId) {
    // A Google-Health-only account (created by connecting Google Health
    // directly, without ever setting a password) can't be signed into with
    // email+password - pick the error copy that tells the person the right
    // way to get in. Mirrors the equivalent Strava conflict handling.
    const errorCode = existingGoogleProfile.passwordHash
      ? "google_health_account_already_linked_with_password"
      : "google_health_account_already_linked_no_password";
    return errorRedirect(appUrl, errorCode, maskEmail(existingGoogleProfile.email));
  }

  let targetUserId: string;
  let targetRole: "employee" | "admin" = "employee";
  let isNewUser = false;

  try {
    if (state.existingUserId) {
      // Already signed in (e.g. reconnecting, or an HR admin linking Google
      // Health) - just attach the tokens to the current session's profile.
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
    } else if (existingGoogleProfile) {
      // Returning employee (no active session) - refresh tokens, then log them in.
      targetUserId = existingGoogleProfile.id;
      targetRole = existingGoogleProfile.role;

      await db
        .update(profiles)
        .set({
          ...tokenFields,
          ...(company && !existingGoogleProfile.companyId ? { companyId: company.id } : {}),
        })
        .where(eq(profiles.id, targetUserId));
    } else {
      // Brand new employee joining via an invite link (or direct connect).
      if (company) {
        const limitCheck = await checkEmployeeLimit(company.id);
        if (!limitCheck.ok) {
          return errorRedirect(appUrl, "employee_limit_reached");
        }
      }

      const syntheticEmail = `googlehealth-${googleUserId}@users.pacevelo.app`;
      const [created] = await db
        .insert(profiles)
        .values({
          email: syntheticEmail,
          fullName: "PaceVelo Athlete",
          role: "employee",
          companyId: company?.id ?? null,
          ...tokenFields,
        })
        .returning({ id: profiles.id });

      targetUserId = created.id;
      isNewUser = true;
    }
  } catch (err) {
    console.error("Failed to save Google Health connection", err);
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
