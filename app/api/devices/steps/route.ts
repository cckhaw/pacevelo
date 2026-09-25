import { NextResponse, type NextRequest } from "next/server";
import { getProfileIdByDeviceSyncToken, recordDeviceStepEntry } from "@/lib/device-sync";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Generous bounds for backfill/clock-skew, not a real usage limit - catches
// garbage input (a malformed date, a device with its clock badly wrong)
// rather than policing how far back someone can report.
const MAX_DAYS_IN_PAST = 90;
const MAX_DAYS_IN_FUTURE = 1;
const MAX_STEPS_PER_DAY = 200_000;

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return request.nextUrl.searchParams.get("token");
}

/**
 * Reports one day's step total from an iOS Shortcut or the Android
 * companion app - the non-OAuth alternative to the (soft-deprecated, see
 * lib/feature-flags.ts) Google Health integration. Authenticated by a
 * long-lived per-profile bearer token rather than a session cookie, since
 * neither caller can do an interactive login.
 */
export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing token (Authorization: Bearer <token> or ?token=)" }, { status: 401 });
  }

  const profileId = await getProfileIdByDeviceSyncToken(token);
  if (!profileId) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const { date, steps } = (body ?? {}) as { date?: unknown; steps?: unknown };

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ error: "date must be a string in YYYY-MM-DD format (your device's own local date)" }, { status: 400 });
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "date is not a valid calendar date" }, { status: 400 });
  }
  const daysFromNow = (parsedDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysFromNow > MAX_DAYS_IN_FUTURE || daysFromNow < -MAX_DAYS_IN_PAST) {
    return NextResponse.json({ error: `date must be within the last ${MAX_DAYS_IN_PAST} days` }, { status: 400 });
  }

  if (typeof steps !== "number" || !Number.isInteger(steps) || steps < 0 || steps > MAX_STEPS_PER_DAY) {
    return NextResponse.json({ error: `steps must be a non-negative integer up to ${MAX_STEPS_PER_DAY}` }, { status: 400 });
  }

  await recordDeviceStepEntry(profileId, date, steps);

  return NextResponse.json({ ok: true, date, steps });
}
