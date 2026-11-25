import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/session-secret";

const RESET_TOKEN_DURATION_SECONDS = 1800; // 30 minutes
const RESET_AUDIENCE = "pacevelo:password-reset";

export interface PasswordResetClaims {
  profileId: string;
  sessionVersion: number;
}

/**
 * Signs a short-lived, single-purpose token for the /reset-password link.
 * It embeds the profile's current sessionVersion, which is bumped when the
 * password changes - so a link stops working the moment it (or any other
 * reset/password change) has been used.
 */
export async function createPasswordResetToken(profileId: string, sessionVersion: number): Promise<string> {
  return new SignJWT({ purpose: "password_reset", sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "pv-reset+jwt" })
    .setSubject(profileId)
    .setAudience(RESET_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());
}

/** Returns the token's claims, or null if missing/expired/tampered. The caller must still compare `sessionVersion` to the database. */
export async function verifyPasswordResetToken(token: string): Promise<PasswordResetClaims | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey(), { audience: RESET_AUDIENCE });
    if (payload.purpose !== "password_reset" || typeof payload.sub !== "string" || typeof payload.sv !== "number") {
      return null;
    }
    return { profileId: payload.sub, sessionVersion: payload.sv };
  } catch {
    return null;
  }
}
