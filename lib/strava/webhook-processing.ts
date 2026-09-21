import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityChallengeCredits, challengeParticipants, profiles } from "@/db/schema";
import { ACTIVITY_TYPES } from "@/lib/validations";
import type { ActivityType, Challenge } from "@/db/schema";
import { getStravaActivity } from "@/lib/strava/client";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";

function isTrackedActivityType(type: string): type is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(type);
}

/**
 * Every currently-active challenge the profile is explicitly enrolled in
 * (via that challenge's own invite link) whose allowed activities and date
 * window cover this activity. A single workout can credit more than one -
 * that's expected once someone has joined multiple concurrent challenges;
 * the admin-facing overlap warning at challenge-creation time is what
 * keeps that from being an accident.
 */
export async function findMatchingChallenges(
  profileId: string,
  activity: { type: ActivityType; startDate: Date },
): Promise<Challenge[]> {
  const enrolled = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.profileId, profileId),
    with: { challenge: true },
  });

  return enrolled
    .map((enrollment) => enrollment.challenge)
    .filter(
      (challenge) =>
        challenge.isActive &&
        challenge.startDate <= activity.startDate &&
        challenge.endDate >= activity.startDate &&
        challenge.allowedActivities.includes(activity.type),
    );
}

/**
 * Handles a Strava `activity.create` webhook event: fetches the full
 * activity, upserts it, and credits every enrolled challenge it qualifies
 * for. Safe to call more than once for the same activity - the upsert on
 * strava_activity_id and the unique (activity, challenge) credit index
 * both make this idempotent against Strava's redeliveries.
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
  const matchingChallenges = await findMatchingChallenges(profile.id, { type: activity.type, startDate });
  if (matchingChallenges.length === 0) return; // Not enrolled in anything this qualifies for.

  const [{ id: activityRowId }] = await db
    .insert(activities)
    .values({
      profileId: profile.id,
      stravaActivityId: activity.id,
      type: activity.type,
      distanceMeters: activity.distance,
      movingTimeSeconds: activity.moving_time,
      elevationGainMeters: activity.total_elevation_gain,
      startDate,
    })
    .onConflictDoUpdate({
      target: activities.stravaActivityId,
      set: {
        distanceMeters: activity.distance,
        movingTimeSeconds: activity.moving_time,
        elevationGainMeters: activity.total_elevation_gain,
      },
    })
    .returning({ id: activities.id });

  await db
    .insert(activityChallengeCredits)
    .values(matchingChallenges.map((challenge) => ({ activityId: activityRowId, challengeId: challenge.id })))
    .onConflictDoNothing({
      target: [activityChallengeCredits.activityId, activityChallengeCredits.challengeId],
    });
}
