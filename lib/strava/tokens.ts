import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { refreshStravaToken } from "@/lib/strava/client";

const EXPIRY_BUFFER_MS = 60_000;

/**
 * Returns a valid Strava access token for the given profile, transparently
 * refreshing it via the stored refresh_token when it's expired (or about
 * to expire). Persists the rotated tokens back to `profiles`.
 */
export async function getValidStravaAccessToken(profileId: string): Promise<string> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: {
      stravaAccessToken: true,
      stravaRefreshToken: true,
      stravaTokenExpiresAt: true,
    },
  });

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }
  if (!profile.stravaAccessToken || !profile.stravaRefreshToken) {
    throw new Error(`Profile ${profileId} has not connected Strava`);
  }

  const expiresAtMs = profile.stravaTokenExpiresAt ? profile.stravaTokenExpiresAt.getTime() : 0;

  if (expiresAtMs - Date.now() > EXPIRY_BUFFER_MS) {
    return profile.stravaAccessToken;
  }

  const refreshed = await refreshStravaToken(profile.stravaRefreshToken);

  await db
    .update(profiles)
    .set({
      stravaAccessToken: refreshed.access_token,
      stravaRefreshToken: refreshed.refresh_token,
      stravaTokenExpiresAt: new Date(refreshed.expires_at * 1000),
    })
    .where(eq(profiles.id, profileId));

  return refreshed.access_token;
}
