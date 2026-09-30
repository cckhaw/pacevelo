import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityChallengeCredits, challengeParticipants, profiles } from "@/db/schema";
import { ACTIVITY_TYPES } from "@/lib/validations";
import type { ActivityType, Challenge } from "@/db/schema";
import { StravaApiError, getStravaActivity } from "@/lib/strava/client";
import { clearStravaConnection, getValidStravaAccessToken } from "@/lib/strava/tokens";

function isTrackedActivityType(type: string): type is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(type);
}

async function findProfileByAthleteId(athleteId: number) {
  return db.query.profiles.findFirst({ where: eq(profiles.stravaAthleteId, athleteId) });
}

/** Every challenge the profile is explicitly enrolled in (via that challenge's own invite link). */
async function loadEnrolledChallenges(profileId: string): Promise<Challenge[]> {
  const enrolled = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.profileId, profileId),
    with: { challenge: true },
  });
  return enrolled.map((enrollment) => enrollment.challenge);
}

/**
 * Whether a challenge counts this activity: it's active, its date window
 * covers the activity, and it allows the activity type. A single workout can
 * credit more than one challenge - that's expected once someone has joined
 * several concurrent ones; the admin-facing overlap warning at
 * challenge-creation time is what keeps that from being an accident.
 */
function qualifies(challenge: Challenge, activity: { type: ActivityType; startDate: Date }): boolean {
  return (
    challenge.isActive &&
    challenge.startDate <= activity.startDate &&
    challenge.endDate >= activity.startDate &&
    challenge.allowedActivities.includes(activity.type)
  );
}

/** Still counting live results. Deactivated or ended challenges are treated as final: later edits never strip credits from them. */
function isOpen(challenge: Challenge, now: Date): boolean {
  return challenge.isActive && challenge.endDate >= now;
}

/**
 * Handles a Strava `activity.create` or `activity.update` event: fetches the
 * current activity and reconciles it against every enrolled challenge -
 * upserting it and crediting the challenges it qualifies for, and removing
 * credits from still-open challenges it no longer qualifies for (e.g. its
 * type was edited to something the challenge doesn't track). Idempotent, so
 * safe against Strava's redeliveries. Strava sends a `create` again when an
 * activity goes from "Only You" back to visible.
 */
export async function processActivityChanged(ownerId: number, activityId: number): Promise<void> {
  const profile = await findProfileByAthleteId(ownerId);
  if (!profile) return; // Webhook for an athlete we don't know about.

  let accessToken: string;
  try {
    accessToken = await getValidStravaAccessToken(profile.id);
  } catch (err) {
    console.error(`No usable Strava token for profile ${profile.id}`, err);
    return;
  }

  let activity;
  try {
    activity = await getStravaActivity(accessToken, activityId);
  } catch (err) {
    if (err instanceof StravaApiError && err.status === 404) {
      // Deleted (or made private) between the event and our fetch.
      await processActivityDeleted(ownerId, activityId);
      return;
    }
    throw err;
  }

  // Athletes who connected before we dropped the `activity:read_all` scope
  // still hold a token that can read "Only You" activities. Respect their
  // privacy setting the same way an `activity:read` token would: treat it as
  // gone.
  if (activity.private === true || activity.visibility === "only_me") {
    await processActivityDeleted(ownerId, activityId);
    return;
  }

  const startDate = new Date(activity.start_date);
  const type = isTrackedActivityType(activity.type) ? activity.type : null; // e.g. Hike, Swim - not a type any challenge tracks.
  const enrolled = await loadEnrolledChallenges(profile.id);
  const matching = type ? enrolled.filter((challenge) => qualifies(challenge, { type, startDate })) : [];
  const now = new Date();
  const openIds = enrolled.filter((challenge) => isOpen(challenge, now)).map((challenge) => challenge.id);

  const existing = await db.query.activities.findFirst({
    where: eq(activities.stravaActivityId, activity.id),
    columns: { id: true },
  });

  if (!type || matching.length === 0) {
    if (!existing) return; // Not enrolled in anything this qualifies for.
    // It stopped qualifying: drop its credits from open challenges, and
    // the row itself once no challenge (open or final) is left crediting it.
    if (openIds.length > 0) {
      await db
        .delete(activityChallengeCredits)
        .where(
          and(
            eq(activityChallengeCredits.activityId, existing.id),
            inArray(activityChallengeCredits.challengeId, openIds),
          ),
        );
    }
    const remainingCredits = await db.$count(
      activityChallengeCredits,
      eq(activityChallengeCredits.activityId, existing.id),
    );
    if (remainingCredits === 0) {
      await db.delete(activities).where(eq(activities.id, existing.id));
    }
    return;
  }

  const [{ id: activityRowId }] = await db
    .insert(activities)
    .values({
      profileId: profile.id,
      stravaActivityId: activity.id,
      type,
      distanceMeters: activity.distance,
      movingTimeSeconds: activity.moving_time,
      elevationGainMeters: activity.total_elevation_gain,
      startDate,
    })
    .onConflictDoUpdate({
      target: activities.stravaActivityId,
      set: {
        type,
        distanceMeters: activity.distance,
        movingTimeSeconds: activity.moving_time,
        elevationGainMeters: activity.total_elevation_gain,
        startDate,
      },
    })
    .returning({ id: activities.id });

  const matchingIds = matching.map((challenge) => challenge.id);
  const noLongerMatchingIds = openIds.filter((id) => !matchingIds.includes(id));
  if (noLongerMatchingIds.length > 0) {
    await db
      .delete(activityChallengeCredits)
      .where(
        and(
          eq(activityChallengeCredits.activityId, activityRowId),
          inArray(activityChallengeCredits.challengeId, noLongerMatchingIds),
        ),
      );
  }

  await db
    .insert(activityChallengeCredits)
    .values(matchingIds.map((challengeId) => ({ activityId: activityRowId, challengeId })))
    .onConflictDoNothing({
      target: [activityChallengeCredits.activityId, activityChallengeCredits.challengeId],
    });
}

/**
 * Handles a Strava `activity.delete` event - also what Strava sends when an
 * activity's visibility is changed to "Only You". Removes it (and, by
 * cascade, its challenge credits). Scoped to the owning athlete's profile,
 * since webhook payloads are unsigned.
 */
export async function processActivityDeleted(ownerId: number, activityId: number): Promise<void> {
  const profile = await findProfileByAthleteId(ownerId);
  if (!profile) return;

  await db
    .delete(activities)
    .where(and(eq(activities.stravaActivityId, activityId), eq(activities.profileId, profile.id)));
}

/**
 * Handles a Strava `athlete.update` event with `authorized: "false"` - the
 * athlete revoked PaceVelo from their Strava settings. Deletes their synced
 * Strava data (Strava's API Policy requires this on revocation) and forgets
 * their tokens and athlete id, so the profile shows as disconnected and can
 * reconnect.
 */
export async function processAthleteDeauthorized(ownerId: number): Promise<void> {
  const profile = await findProfileByAthleteId(ownerId);
  if (!profile) return;

  await clearStravaConnection(profile.id);
}
