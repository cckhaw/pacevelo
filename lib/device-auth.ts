import "server-only";

import type { NextRequest } from "next/server";
import { getProfileIdByDeviceSyncToken } from "@/lib/device-sync";

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return request.nextUrl.searchParams.get("token");
}

/** Shared by every /api/devices/* route: the bearer token (header or ?token=) resolved to a profile id, or null if missing/invalid. */
export async function authenticateDeviceRequest(request: NextRequest): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  return getProfileIdByDeviceSyncToken(token);
}
