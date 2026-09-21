import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/session-secret";

const RESET_TOKEN_DURATION_SECONDS = 1800; // 30 minutes

/** Signs a short-lived, single-purpose token for the /reset-password link - no DB row needed, same approach as the Strava OAuth state. */
export async function createPasswordResetToken(profileId: string): Promise<string> {
  return new SignJWT({ purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profileId)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());
}

/** Returns the profile id the token was issued for, or null if missing/expired/tampered. */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (payload.purpose !== "password_reset" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}
