import "server-only";

import { randomBytes } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, stepEntries } from "@/db/schema";

function randomToken(): string {
  return `pv_${randomBytes(24).toString("hex")}`;
}

async function generateUniqueToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomToken();
    const collision = await db.query.profiles.findFirst({
      where: eq(profiles.deviceSyncToken, token),
      columns: { id: true },
    });
    if (!collision) return token;
  }
  throw new Error("Could not generate a unique device sync token, please try again.");
}

/** Returns the signed-in profile's device sync token, generating one on first use. */
export async function getOrCreateDeviceSyncToken(profileId: string): Promise<string> {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: { deviceSyncToken: true },
  });
  if (existing?.deviceSyncToken) return existing.deviceSyncToken;

  const token = await generateUniqueToken();
  await db.update(profiles).set({ deviceSyncToken: token }).where(eq(profiles.id, profileId));
  return token;
}

/** Replaces the signed-in profile's token - any Shortcut/app still configured with the old one stops working immediately. */
export async function regenerateDeviceSyncToken(profileId: string): Promise<string> {
  const token = await generateUniqueToken();
  await db.update(profiles).set({ deviceSyncToken: token }).where(eq(profiles.id, profileId));
  return token;
}

/** Looks up which profile a device-sync bearer token belongs to - null if the token is unset/invalid. */
export async function getProfileIdByDeviceSyncToken(token: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.deviceSyncToken, token),
    columns: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * Records one day's step total reported by an iOS Shortcut or the Android
 * companion app. `day` is midnight-UTC-anchored, matching the convention
 * lib/google-health/sync.ts already uses, so getParticipantBreakdown's
 * per-day grouping stays correct regardless of which source a step_entries
 * row came from. This replaces the day's total rather than adding to it -
 * callers report their full day-so-far count each time, not a delta.
 */
export async function recordDeviceStepEntry(profileId: string, day: string, steps: number): Promise<void> {
  await db
    .insert(stepEntries)
    .values({ profileId, day: new Date(`${day}T00:00:00.000Z`), steps })
    .onConflictDoUpdate({
      target: [stepEntries.profileId, stepEntries.day],
      set: { steps: sql`excluded.steps`, updatedAt: sql`now()` },
    });
}

export interface LatestStepSync {
  day: Date;
  steps: number;
  updatedAt: Date;
}

/**
 * The most recently *updated* step_entries row for a profile - not the most
 * recent day, since someone could backfill an older day after today's.
 * Powers the "last synced" status on /dashboard/devices, which is how
 * someone actually confirms their Shortcut (or the Android app, or a still-
 * connected Google Health account, if they have one - step_entries doesn't
 * track which source wrote a row) is really reaching the server, rather
 * than trusting a silent background automation on faith.
 */
export async function getLatestStepSync(profileId: string): Promise<LatestStepSync | null> {
  const [row] = await db
    .select({ day: stepEntries.day, steps: stepEntries.steps, updatedAt: stepEntries.updatedAt })
    .from(stepEntries)
    .where(eq(stepEntries.profileId, profileId))
    .orderBy(desc(stepEntries.updatedAt))
    .limit(1);
  return row ?? null;
}
