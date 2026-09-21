import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { activities, challenges, profiles } from "@/db/schema";
import { ACTIVITY_TYPES } from "@/lib/validations";
import type { ActivityType, Challenge } from "@/db/schema";
import { getStravaActivity } from "@/lib/strava/client";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";

function isTrackedActivityType(type: string): type is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(type);
}

/**
 * Picks the single challenge a newly-synced activity should be attributed
 * to. `activities.strava_activity_id` is globally unique, so an activity
 * can only ever belong to one challenge - when several of the company's
 * active challenges could claim it, a department-targeted challenge wins
 * over a company-wide one, then the one that started earliest.
 */
export async function findMatchingChallenge(
  profile: { companyId: string | null; department: string | null },
  activity: { type: ActivityType; startDate: Date },
): Promise<Challenge | null> {
  if (!profile.companyId) return null;

  const candidates = await db.query.challenges.findMany({
    where: and(
      eq(challenges.companyId, profile.companyId),
      eq(challenges.isActive, true),
      lte(challenges.startDate, activity.startDate),
      gte(challenges.endDate, activity.startDate),
    ),
  });

  const matching = candidates.filter((challenge) => {
    if (!challenge.allowedActivities.includes(activity.type)) return false;
    if (!challenge.targetDepartments?.length) return true;
    return Boolean(profile.department && challenge.targetDepartments.includes(profile.department));
  });

  if (matching.length === 0) return null;

  matching.sort((a, b) => {
    const aTargeted = a.targetDepartments?.length ? 0 : 1;
    const bTargeted = b.targetDepartments?.length ? 0 : 1;
    if (aTargeted !== bTargeted) return aTargeted - bTargeted;
    return a.startDate.getTime() - b.startDate.getTime();
  });

  return matching[0];
}

/**
 * Handles a Strava `activity.create` webhook event: fetches the full
 * activity, matches it to an active challenge, and records it. Safe to
 * call more than once for the same activity (idempotent on
 * strava_activity_id).
 */
export async function processActivityCreated(ownerId: number, activityId: number): Promise<void> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.stravaAthleteId, ownerId),
  });
  if (!profile) return; // Webhook for an athlete we don't know about.

  let accessToken: string;
  try {
    accessToken = await getValidStravaAccessToken(profile.id);
  } catch (err) {
    console.error(`No usable Strava token for profile ${profile.id}`, err);
    return;
  }

  const activity = await getStravaActivity(accessToken, activityId);

  if (!isTrackedActivityType(activity.type)) return; // e.g. Hike, Swim - not a type any challenge tracks.

  const startDate = new Date(activity.start_date);
  const challenge = await findMatchingChallenge(profile, { type: activity.type, startDate });
  if (!challenge) return; // No active challenge covers this activity.

  await db
    .insert(activities)
    .values({
      profileId: profile.id,
      challengeId: challenge.id,
      stravaActivityId: activity.id,
      type: activity.type,
      distanceMeters: activity.distance,
      movingTimeSeconds: activity.moving_time,
      elevationGainMeters: activity.total_elevation_gain,
      startDate,
    })
    .onConflictDoNothing({ target: activities.stravaActivityId });
}
