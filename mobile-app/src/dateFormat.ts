/** Ported from the native app's StepMath.kt formatting helpers. */

/** The device's own local calendar date, matching what the server's /api/devices/steps expects. */
export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Sep 25, 2026" from a challenge's ISO start/end date - shown in UTC since that's the calendar day the server itself scores by, matching the dashboard. */
export function formatChallengeDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

/** "Sep 25, 2026, 2:30 PM" from a sync's ISO timestamp - in `timeZone` (the phone's own local time zone by default), since this is when *this device* last saw it happen. */
export function formatSyncTimestamp(iso: string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
