import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { refreshStravaToken } from "@/lib/strava/client";

const EXPIRY_BUFFER_MS = 60_000;

/**
 * Returns a valid Strava access token for the given profile, transparently
 * refreshing it via the stored refresh_token when it's expired (or about
 * to expire). Persists the rotated tokens back to `profiles`.
 */
export async function getValidStravaAccessToken(profileId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    throw new Error(`Profile ${profileId} not found`);
  }
  if (!profile.strava_access_token || !profile.strava_refresh_token) {
    throw new Error(`Profile ${profileId} has not connected Strava`);
  }

  const expiresAtMs = profile.strava_token_expires_at
    ? new Date(profile.strava_token_expires_at).getTime()
    : 0;

  if (expiresAtMs - Date.now() > EXPIRY_BUFFER_MS) {
    return profile.strava_access_token;
  }

  const refreshed = await refreshStravaToken(profile.strava_refresh_token);

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      strava_access_token: refreshed.access_token,
      strava_refresh_token: refreshed.refresh_token,
      strava_token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq("id", profileId);

  if (updateError) {
    throw new Error(`Failed to persist refreshed Strava token: ${updateError.message}`);
  }

  return refreshed.access_token;
}
