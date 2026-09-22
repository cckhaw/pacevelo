import { NextResponse, type NextRequest } from "next/server";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { syncStepsForProfile } from "@/lib/google-health/sync";

export const maxDuration = 60;

/**
 * Periodic pull-based sync for Google Health step data. Unlike Strava,
 * Google Health has no webhook push mechanism, so this cron (see
 * vercel.json) is what keeps step_entries current - runs for every profile
 * that has connected Google Health.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectedProfiles = await db.query.profiles.findMany({
    where: isNotNull(profiles.googleHealthUserId),
    columns: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const profile of connectedProfiles) {
    try {
      await syncStepsForProfile(profile.id);
      succeeded++;
    } catch (err) {
      failed++;
      console.error(`Google Health sync failed for profile ${profile.id}`, err);
    }
  }

  return NextResponse.json({ total: connectedProfiles.length, succeeded, failed });
}
