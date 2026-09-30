import "server-only";

import { eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { challengeParticipants, challenges, profiles } from "@/db/schema";

export { DEFAULT_STALE_AFTER_DAYS, staleAfterDays } from "@/lib/strava/config";

/**
 * Profiles that still hold a Strava authorization but have had no reason to
 * for `days` days: every challenge they joined ended at least that long ago
 * (a challenge that hasn't ended yet, however far out, keeps them current),
 * or they never joined one and connected at least that long ago. Reconnecting
 * is a single OAuth click, so revoking these keeps the app's connected-athlete
 * count honest at little cost to the person.
 */
export async function findStaleStravaProfiles(days: number, limit: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const lastRelevantAt = sql<Date>`coalesce(max(${challenges.endDate}), ${profiles.createdAt})`;

  return db
    .select({ id: profiles.id, lastRelevantAt })
    .from(profiles)
    .leftJoin(challengeParticipants, eq(challengeParticipants.profileId, profiles.id))
    .leftJoin(challenges, eq(challenges.id, challengeParticipants.challengeId))
    .where(isNotNull(profiles.stravaAthleteId))
    .groupBy(profiles.id)
    .having(sql`${lastRelevantAt} < ${cutoff}::timestamptz`)
    .limit(limit);
}
