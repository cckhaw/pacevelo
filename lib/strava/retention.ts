import "server-only";

import { and, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityChallengeCredits, challenges } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Activities past retention: none of the challenges that credit them ended
 * within the last `days` days (so every one ended longer ago than that), or
 * nothing credits them at all. The one-day age floor keeps a freshly synced
 * activity from being caught in the moment between its insert and its
 * credits' insert.
 */
function expiredActivities(days: number) {
  const cutoff = new Date(Date.now() - days * DAY_MS).toISOString();
  return and(
    lt(activities.createdAt, new Date(Date.now() - DAY_MS)),
    sql`not exists (
      select 1
      from ${activityChallengeCredits} c
      inner join ${challenges} ch on ch.id = c.challenge_id
      where c.activity_id = ${activities.id} and ch.end_date >= ${cutoff}::timestamptz
    )`,
  );
}

/** How many activities `purgeExpiredStravaActivities(days)` would delete right now. */
export function countExpiredStravaActivities(days: number): Promise<number> {
  return db.$count(activities, expiredActivities(days));
}

/**
 * Deletes synced Strava activities once `days` days have passed since the
 * last challenge crediting them ended (their challenge credits cascade).
 * Idempotent; returns how many were deleted.
 */
export async function purgeExpiredStravaActivities(days: number): Promise<number> {
  const deleted = await db.delete(activities).where(expiredActivities(days)).returning({ id: activities.id });
  return deleted.length;
}
