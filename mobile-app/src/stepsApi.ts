/** Ported from the native app's StepsApi.kt - same endpoints, same shapes, fetch() instead of HttpURLConnection. */

export type PostStepsResult = { ok: true } | { ok: false; error: string };

/**
 * POSTs one day's step total to PaceVelo's device-sync endpoint (see
 * app/api/devices/steps/route.ts) - syncUrl already carries the profile's
 * bearer token as a query param, exactly as scanned from the dashboard's
 * QR code.
 */
export async function postSteps(syncUrl: string, date: string, steps: number): Promise<PostStepsResult> {
  try {
    const response = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, steps }),
    });

    if (response.ok) {
      return { ok: true };
    }
    const errorBody = await response.text().catch(() => "");
    return { ok: false, error: `HTTP ${response.status}: ${errorBody}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface SyncedChallenge {
  title: string;
  startDate: string;
  endDate: string;
}

export interface LastSync {
  day: string;
  steps: number;
  updatedAt: string;
}

export interface SyncStatus {
  profile: { fullName: string; email: string };
  challenges: SyncedChallenge[];
  lastSync: LastSync | null;
}

/**
 * Same host/token as postSteps' syncUrl, read instead of posted to - see
 * app/api/devices/status/route.ts. Derived by swapping the path rather
 * than taking a second QR code, since the server always serves both
 * endpoints from the same origin with the same token.
 */
function statusUrl(syncUrl: string): string {
  return syncUrl.replace("/api/devices/steps", "/api/devices/status");
}

/** GETs the connected account, its currently-active steps challenge(s), and when a sync last landed. */
export async function getStatus(syncUrl: string): Promise<SyncStatus | null> {
  try {
    const response = await fetch(statusUrl(syncUrl));
    if (!response.ok) return null;
    return (await response.json()) as SyncStatus;
  } catch {
    return null;
  }
}
