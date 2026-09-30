import "server-only";

import { StravaApiError, deauthorizeStrava } from "@/lib/strava/client";
import { StravaConnectionRevokedError, clearStravaConnection, getValidStravaAccessToken } from "@/lib/strava/tokens";

export type RevokeOutcome = "revoked" | "already_revoked" | "failed";

/**
 * Revokes PaceVelo's access on Strava (so the athlete stops counting against
 * this app's connected-athlete capacity) and forgets the connection locally.
 *
 * By default the local connection is cleared even when the Strava call
 * fails, so a person or admin is never stuck unable to disconnect. Pass
 * `keepOnFailure` for background cleanup, which should leave the connection in
 * place on a transient failure so the next run retries instead of orphaning
 * an authorization that Strava still counts.
 */
export async function revokeStravaConnection(
  profileId: string,
  { keepOnFailure = false }: { keepOnFailure?: boolean } = {},
): Promise<RevokeOutcome> {
  let accessToken: string;
  try {
    accessToken = await getValidStravaAccessToken(profileId);
  } catch (err) {
    if (err instanceof StravaConnectionRevokedError) return "already_revoked"; // already cleared
    console.error(`Could not get a Strava token to revoke for profile ${profileId}`, err);
    if (!keepOnFailure) await clearStravaConnection(profileId);
    return "failed";
  }

  try {
    await deauthorizeStrava(accessToken);
  } catch (err) {
    // 401: the token is already dead, i.e. Strava no longer counts this athlete.
    if (err instanceof StravaApiError && err.status === 401) {
      await clearStravaConnection(profileId);
      return "already_revoked";
    }
    console.error(`Failed to revoke Strava access for profile ${profileId}`, err);
    if (!keepOnFailure) await clearStravaConnection(profileId);
    return "failed";
  }

  await clearStravaConnection(profileId);
  return "revoked";
}
