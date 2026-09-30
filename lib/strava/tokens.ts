import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, profiles } from "@/db/schema";
import { StravaApiError, refreshStravaToken } from "@/lib/strava/client";

const EXPIRY_BUFFER_MS = 60_000;

/** The athlete revoked PaceVelo's access on Strava's side; the local connection has already been cleared. */
export class StravaConnectionRevokedError extends Error {
  constructor(profileId: string) {
    super(`Strava access was revoked for profile ${profileId}`);
    this.name = "StravaConnectionRevokedError";
  }
}

/**
 * Ends a profile's Strava connection locally: deletes the Strava data we hold
 * for them (synced activities - their challenge credits cascade - and the
 * Strava profile photo URL), then forgets the athlete id + tokens, which also
 * frees that Strava account to be connected to a different profile. Strava's
 * API Policy (2.5, 7.4) requires deleting an athlete's data when they revoke
 * access, so every path that ends a connection goes through here.
 * Does not call Strava - see `revokeStravaConnection` for that.
 *
 * Data is deleted before the tokens are cleared on purpose: if this fails
 * partway, the connection is still there for a retry (the athlete id is what
 * every later cleanup path keys off), rather than leaving orphaned data with
 * nothing pointing at it.
 */
export async function clearStravaConnection(profileId: string): Promise<void> {
  await db.delete(activities).where(eq(activities.profileId, profileId));
  await db
    .update(profiles)
    .set({
      avatarUrl: null,
      stravaAthleteId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiresAt: null,
    })
    .where(eq(profiles.id, profileId));
}

/**
 * Strava answers a refresh with a revoked/invalid refresh token with a 400/401
 * naming the RefreshToken resource. Deliberately narrow: a 401 for our own bad
 * client credentials, or any 5xx/429, must NOT be read as "the athlete left" -
 * that would wipe every connection at once.
 */
function isRefreshTokenRejected(err: unknown): boolean {
  return (
    err instanceof StravaApiError && (err.status === 400 || err.status === 401) && err.body.includes("RefreshToken")
  );
}

/**
 * Returns a valid Strava access token for the given profile, transparently
 * refreshing it via the stored refresh_token when it's expired (or about
 * to expire). Persists the rotated tokens back to `profiles`. If Strava
 * rejects the refresh token (the athlete revoked access), clears the stale
 * connection and throws StravaConnectionRevokedError.
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

  let refreshed;
  try {
    refreshed = await refreshStravaToken(profile.stravaRefreshToken);
  } catch (err) {
    if (isRefreshTokenRejected(err)) {
      await clearStravaConnection(profileId);
      throw new StravaConnectionRevokedError(profileId);
    }
    throw err;
  }

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
