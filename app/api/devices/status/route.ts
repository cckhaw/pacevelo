import { NextResponse, type NextRequest } from "next/server";
import { getDeviceSyncStatus } from "@/lib/device-sync";
import { authenticateDeviceRequest } from "@/lib/device-auth";

/**
 * What the iOS Shortcut / Android app shows once connected: which account
 * and which currently-active step-based challenge (with its period) a sync
 * counts toward, plus when the last one actually landed - the same bearer
 * token auth as POST /api/devices/steps, just read-only.
 */
export async function GET(request: NextRequest) {
  const profileId = await authenticateDeviceRequest(request);
  if (!profileId) {
    return NextResponse.json(
      { error: "Missing or invalid token (Authorization: Bearer <token> or ?token=)" },
      { status: 401 },
    );
  }

  const status = await getDeviceSyncStatus(profileId);
  if (!status) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: { fullName: status.fullName, email: status.email },
    challenges: status.challenges.map((c) => ({
      id: c.id,
      title: c.title,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
    })),
    lastSync: status.lastSync
      ? {
          day: status.lastSync.day.toISOString().slice(0, 10),
          steps: status.lastSync.steps,
          updatedAt: status.lastSync.updatedAt.toISOString(),
        }
      : null,
  });
}
