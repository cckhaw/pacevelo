import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { refreshGoogleHealthToken } from "@/lib/google-health/client";

const EXPIRY_BUFFER_MS = 60_000;

/**
 * Returns a valid Google Health access token for the given profile,
 * transparently refreshing it via the stored refresh_token when it's
 * expired (or about to expire). Persists the rotated access token back to
 * `profiles` (Google doesn't rotate the refresh token on each use).
 */
export async function getValidGoogleHealthAccessToken(profileId: string): Promise<string> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: {
      googleHealthAccessToken: true,
      googleHealthRefreshToken: true,
      googleHealthTokenExpiresAt: true,
    },
  });

  if (!profile) {
    throw new Error(`Profile ${profileId} not found`);
  }
  if (!profile.googleHealthAccessToken || !profile.googleHealthRefreshToken) {
    throw new Error(`Profile ${profileId} has not connected Google Health`);
  }

  const expiresAtMs = profile.googleHealthTokenExpiresAt ? profile.googleHealthTokenExpiresAt.getTime() : 0;

  if (expiresAtMs - Date.now() > EXPIRY_BUFFER_MS) {
    return profile.googleHealthAccessToken;
  }

  const refreshed = await refreshGoogleHealthToken(profile.googleHealthRefreshToken);

  await db
    .update(profiles)
    .set({
      googleHealthAccessToken: refreshed.accessToken,
      googleHealthTokenExpiresAt: refreshed.expiresAt,
    })
    .where(eq(profiles.id, profileId));

  return refreshed.accessToken;
}
