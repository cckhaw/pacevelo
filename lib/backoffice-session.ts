import "server-only";

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecretKey } from "@/lib/session-secret";
import { verifyTotp } from "@/lib/totp";

const BACKOFFICE_SESSION_COOKIE = "pacevelo_backoffice_session";
const BACKOFFICE_SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths, so pad first - the length
  // check itself doesn't need to be constant-time, only the content compare.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Checks `username`/`password` against BACKOFFICE_USERNAME/PASSWORD env vars. */
export function verifyBackofficeCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.BACKOFFICE_USERNAME;
  const expectedPassword = process.env.BACKOFFICE_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

/**
 * Optional IP allow-list: BACKOFFICE_ALLOWED_IPS="1.2.3.4,5.6.7.8". Unset
 * means no IP restriction (rate limiting + TOTP still apply).
 */
export function isBackofficeIpAllowed(ip: string): boolean {
  const raw = process.env.BACKOFFICE_ALLOWED_IPS;
  if (!raw) return true;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .includes(ip);
}

/** Second factor: when BACKOFFICE_TOTP_SECRET (base32) is set, a valid authenticator code is required. */
export function verifyBackofficeTotp(code: string): boolean {
  const secret = process.env.BACKOFFICE_TOTP_SECRET;
  if (!secret) return true;
  try {
    return verifyTotp(secret, code);
  } catch (err) {
    console.error("BACKOFFICE_TOTP_SECRET is invalid", err);
    return false;
  }
}

export async function createBackofficeSession() {
  const token = await new SignJWT({ scope: "backoffice" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("pacevelo:backoffice")
    .setIssuedAt()
    .setExpirationTime(`${BACKOFFICE_SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(BACKOFFICE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: BACKOFFICE_SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function hasBackofficeSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(BACKOFFICE_SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, sessionSecretKey(), { audience: "pacevelo:backoffice" });
    return payload.scope === "backoffice";
  } catch {
    return false;
  }
}

export async function clearBackofficeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(BACKOFFICE_SESSION_COOKIE);
}
