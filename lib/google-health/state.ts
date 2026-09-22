import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/session-secret";

const STATE_DURATION_SECONDS = 600; // matches Strava's own authorization window

export interface GoogleHealthOAuthState {
  companySlug?: string;
  redirectTo?: string;
  existingUserId?: string;
}

/**
 * Signs the OAuth state as a short-lived JWT instead of pairing it with a
 * nonce cookie - see the identical rationale in lib/strava/state.ts (the
 * redirect_uri host can differ from the host that started the flow, so a
 * cookie set on the starting host isn't guaranteed to come back).
 */
export async function encodeGoogleHealthState(state: GoogleHealthOAuthState): Promise<string> {
  return new SignJWT({ ...state })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());
}

export async function decodeGoogleHealthState(raw: string): Promise<GoogleHealthOAuthState | null> {
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
