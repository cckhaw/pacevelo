import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { stepEntries } from "@/db/schema";
import { getValidGoogleHealthAccessToken } from "@/lib/google-health/tokens";
import { getDailySteps } from "@/lib/google-health/client";

// How far back to pull on each sync. Covers a normal gap between syncs (the
// cron in app/api/cron/sync-google-health/route.ts) with headroom for
// someone reconnecting after being disconnected for a few weeks.
const SYNC_WINDOW_DAYS = 30;

/** Pulls recent daily step totals from Google Health and upserts them into step_entries. */
export async function syncStepsForProfile(profileId: string): Promise<{ daysSynced: number }> {
  const accessToken = await getValidGoogleHealthAccessToken(profileId);

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const byDay = await getDailySteps(accessToken, startTime, endTime);
  if (byDay.size === 0) {
    return { daysSynced: 0 };
  }

  const rows = [...byDay.entries()].map(([day, steps]) => ({
    profileId,
    day: new Date(`${day}T00:00:00.000Z`),
    steps,
  }));

  await db
    .insert(stepEntries)
    .values(rows)
    .onConflictDoUpdate({
      target: [stepEntries.profileId, stepEntries.day],
      set: { steps: sql`excluded.steps`, updatedAt: sql`now()` },
    });

  return { daysSynced: rows.length };
}
