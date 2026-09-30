import { NextResponse, type NextRequest } from "next/server";
import { revokeStravaConnection } from "@/lib/strava/connection";
import { findStaleStravaProfiles, staleAfterDays } from "@/lib/strava/stale-athletes";

export const maxDuration = 60;

const BATCH_SIZE = 100;

/**
 * Daily cleanup of stale Strava connections (see vercel.json): revokes
 * PaceVelo's access on Strava for athletes with no recent challenge, so they
 * stop counting against the app's connected-athlete capacity. Anyone
 * affected just reconnects from their dashboard.
 *
 * `?dryRun=1` lists who would be revoked without touching anything (add
 * `&days=N` to preview a different cutoff than configured). Unlike
 * the other cron, this one refuses to run at all unless CRON_SECRET is set,
 * since it revokes real connections.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  // Only a dry run may override the cutoff (`&days=30`), so "what if" previews
  // are free but a real run always uses the configured value.
  const requestedDays = Number(request.nextUrl.searchParams.get("days"));
  const days = dryRun && Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : staleAfterDays();
  const stale = await findStaleStravaProfiles(days, BATCH_SIZE);

  if (dryRun) {
    return NextResponse.json({ dryRun: true, staleAfterDays: days, wouldRevoke: stale });
  }

  const outcomes = { revoked: 0, already_revoked: 0, failed: 0 };
  for (const profile of stale) {
    // Leave the connection in place on a transient Strava failure so the
    // next run retries, rather than orphaning an authorization Strava
    // still counts.
    outcomes[await revokeStravaConnection(profile.id, { keepOnFailure: true })]++;
  }

  return NextResponse.json({ staleAfterDays: days, total: stale.length, ...outcomes });
}
