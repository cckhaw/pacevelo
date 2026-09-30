/**
 * Day-count settings for Strava data handling, read from env with defaults.
 * Deliberately free of server-only/db imports so pages (e.g. the privacy
 * policy) can show the same values the cleanup job actually enforces.
 */

export const DEFAULT_STALE_AFTER_DAYS = 7;
export const DEFAULT_DATA_RETENTION_DAYS = 30;

function positiveDays(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Days after an athlete's last challenge ended before their idle Strava connection is revoked (STRAVA_STALE_AFTER_DAYS). */
export function staleAfterDays(): number {
  return positiveDays(process.env.STRAVA_STALE_AFTER_DAYS, DEFAULT_STALE_AFTER_DAYS);
}

/** Days after a challenge ends before the Strava activities credited to it are deleted (STRAVA_DATA_RETENTION_DAYS). */
export function dataRetentionDays(): number {
  return positiveDays(process.env.STRAVA_DATA_RETENTION_DAYS, DEFAULT_DATA_RETENTION_DAYS);
}
