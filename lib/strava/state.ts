import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/session-secret";

const STATE_DURATION_SECONDS = 600; // matches Strava's own authorization window

export interface StravaOAuthState {
  companySlug?: string;
  redirectTo?: string;
  existingUserId?: string;
}

/**
 * Signs the OAuth state as a short-lived JWT instead of pairing it with a
 * nonce cookie. Strava's redirect_uri is pinned to NEXT_PUBLIC_APP_URL, which
 * can be a different host than the one that started the flow (e.g. a custom
 * domain) - a cookie set on the starting host wouldn't be sent back to the
 * callback host, breaking the handshake. Signing the state itself removes
 * that dependency on cookies matching across hosts.
 */
export async function encodeStravaState(state: StravaOAuthState): Promise<string> {
  return new SignJWT({ ...state })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());
}

export async function decodeStravaState(raw: string): Promise<StravaOAuthState | null> {
  try {
    const { payload } = await jwtVerify(raw, sessionSecretKey());
    return {
      companySlug: typeof payload.companySlug === "string" ? payload.companySlug : undefined,
      redirectTo: typeof payload.redirectTo === "string" ? payload.redirectTo : undefined,
      existingUserId: typeof payload.existingUserId === "string" ? payload.existingUserId : undefined,
    };
  } catch {
    return null;
  }
}
