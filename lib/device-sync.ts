import "server-only";

import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
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
