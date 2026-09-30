import { NextResponse, type NextRequest } from "next/server";
import { dataRetentionDays, staleAfterDays } from "@/lib/strava/config";
import { revokeStravaConnection } from "@/lib/strava/connection";
import { countExpiredStravaActivities, purgeExpiredStravaActivities } from "@/lib/strava/retention";
import { findStaleStravaProfiles } from "@/lib/strava/stale-athletes";

export const maxDuration = 60;

const BATCH_SIZE = 100;

/** A positive number from a query param, or null. */
function positiveParam(request: NextRequest, name: string): number | null {
  const value = Number(request.nextUrl.searchParams.get(name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Daily Strava housekeeping (see vercel.json):
 *
 * 1. Deletes synced Strava activities once STRAVA_DATA_RETENTION_DAYS
 *    (default 30) have passed since the last challenge crediting them ended.
 * 2. Revokes PaceVelo's access on Strava for athletes with no recent
 *    challenge (STRAVA_STALE_AFTER_DAYS, default 7), so they stop counting
 *    against the app's connected-athlete capacity. Anyone affected just
 *    reconnects from their dashboard.
 *
 * `?dryRun=1` reports what would happen without touching anything; a dry run
 * also accepts `&days=N` (revocation cutoff) and `&retentionDays=N` to preview
 * other values than configured. Unlike the other cron, this one refuses to
 * run at all unless CRON_SECRET is set, since it deletes data and revokes
 * real connections.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  // Only a dry run may override the configured values, so "what if" previews
  // are free but a real run always uses what's configured.
  const staleDays = (dryRun && positiveParam(request, "days")) || staleAfterDays();
  const retentionDays = (dryRun && positiveParam(request, "retentionDays")) || dataRetentionDays();

  const stale = await findStaleStravaProfiles(staleDays, BATCH_SIZE);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      staleAfterDays: staleDays,
      wouldRevoke: stale,
      retentionDays,
      wouldPurgeActivities: await countExpiredStravaActivities(retentionDays),
    });
  }

  const purgedActivities = await purgeExpiredStravaActivities(retentionDays);

  const outcomes = { revoked: 0, already_revoked: 0, failed: 0 };
  for (const profile of stale) {
    // Leave the connection in place on a transient Strava failure so the
    // next run retries, rather than orphaning an authorization Strava
    // still counts.
    outcomes[await revokeStravaConnection(profile.id, { keepOnFailure: true })]++;
  }

  return NextResponse.json({
    staleAfterDays: staleDays,
    total: stale.length,
    ...outcomes,
    retentionDays,
    purgedActivities,
  });
}
