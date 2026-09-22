"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";
import { deauthorizeStrava } from "@/lib/strava/client";
import { revokeGoogleHealthToken } from "@/lib/google-health/client";
import { syncStepsForProfile } from "@/lib/google-health/sync";

export interface DisconnectStravaState {
  error?: string;
}

/** Unlinks Strava from the signed-in profile, freeing that Strava account to be connected to a different PaceVelo profile. */
export async function disconnectStrava(): Promise<DisconnectStravaState> {
  const session = await getSession();
  if (!session) return { error: "You're not signed in." };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { stravaAthleteId: true },
  });
  if (!profile?.stravaAthleteId) {
    return { error: "No Strava account is connected." };
  }

  try {
    const accessToken = await getValidStravaAccessToken(session.userId);
    await deauthorizeStrava(accessToken);
  } catch (err) {
    // Still unlink locally even if revoking with Strava fails (e.g. the
    // token was already invalid) - the important part is freeing this
    // athlete ID up for a different profile to connect.
    console.error("Failed to revoke Strava access during disconnect", err);
  }

  await db
    .update(profiles)
    .set({
      stravaAthleteId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiresAt: null,
    })
    .where(eq(profiles.id, session.userId));

  revalidatePath("/dashboard");
  return {};
}

export interface DisconnectGoogleHealthState {
  error?: string;
}

/** Unlinks Google Health from the signed-in profile, freeing that Google account to be connected to a different PaceVelo profile. */
export async function disconnectGoogleHealth(): Promise<DisconnectGoogleHealthState> {
  const session = await getSession();
  if (!session) return { error: "You're not signed in." };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { googleHealthUserId: true, googleHealthAccessToken: true },
  });
  if (!profile?.googleHealthUserId) {
    return { error: "No Google Health account is connected." };
  }

  try {
    if (profile.googleHealthAccessToken) {
      await revokeGoogleHealthToken(profile.googleHealthAccessToken);
    }
  } catch (err) {
    // Still unlink locally even if revoking with Google fails (e.g. the
    // token was already invalid) - the important part is freeing this
    // Google account up for a different profile to connect.
    console.error("Failed to revoke Google Health access during disconnect", err);
  }

  await db
    .update(profiles)
    .set({
      googleHealthUserId: null,
      googleHealthAccessToken: null,
      googleHealthRefreshToken: null,
      googleHealthTokenExpiresAt: null,
    })
    .where(eq(profiles.id, session.userId));

  revalidatePath("/dashboard");
  return {};
}

export interface SyncGoogleHealthState {
  error?: string;
  daysSynced?: number;
}

/** Manually pulls recent step data from Google Health - a stand-in for push updates, since Google Health has no webhook mechanism (unlike Strava). */
export async function syncGoogleHealthSteps(): Promise<SyncGoogleHealthState> {
  const session = await getSession();
  if (!session) return { error: "You're not signed in." };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { googleHealthUserId: true },
  });
  if (!profile?.googleHealthUserId) {
    return { error: "No Google Health account is connected." };
  }

  try {
    const { daysSynced } = await syncStepsForProfile(session.userId);
    revalidatePath("/dashboard");
    return { daysSynced };
  } catch (err) {
    console.error("Failed to sync Google Health steps", err);
    // Surfaces the underlying error (e.g. Google's own HTTP status/body) so
    // it's visible without needing Vercel log access - useful while the
    // Google Health API request shape is still unverified (see README).
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Could not sync steps from Google Health: ${detail}` };
  }
}
