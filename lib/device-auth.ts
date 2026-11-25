import "server-only";

import type { NextRequest } from "next/server";
import { getProfileIdByDeviceSyncToken } from "@/lib/device-sync";
import { consumeRateLimit, safely, type RateLimitRule } from "@/lib/rate-limit";

// Generous for legitimate clients (a few syncs an hour) but caps token guessing and abuse.
const DEVICE_IP_RULE: RateLimitRule = { limit: 120, windowSeconds: 10 * 60 };

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// The Authorization header is preferred. `?token=` remains accepted only
// because already-deployed iOS Shortcuts / Android / Expo clients scan a QR
// code containing the URL form; retire it once those are updated.
function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return request.nextUrl.searchParams.get("token");
}

/** Shared by every /api/devices/* route: the bearer token resolved to a profile id, or null if missing/invalid/rate-limited. */
export async function authenticateDeviceRequest(request: NextRequest): Promise<string | null> {
  const limit = await safely(
    () => consumeRateLimit(`device:ip:${clientIp(request)}`, DEVICE_IP_RULE),
    { ok: true, retryAfterSeconds: 0 },
  );
  if (!limit.ok) return null;

  const token = bearerToken(request);
  if (!token) return null;
  return getProfileIdByDeviceSyncToken(token);
}
