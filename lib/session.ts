import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { loginEvents } from "@/db/schema";
import type { ProfileRole } from "@/db/schema";
import { sessionSecretKey } from "@/lib/session-secret";

const SESSION_COOKIE = "pacevelo_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  role: ProfileRole;
}

/** Signs a JWT for `payload`, sets it as an httpOnly session cookie, and records a login event for visit-frequency stats. */
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  try {
    await db.insert(loginEvents).values({ profileId: payload.userId, role: payload.role });
  } catch (err) {
    // Visit-frequency logging is a nice-to-have for the back office - never
    // let a failure here (e.g. a pending migration) break sign-in itself.
    console.error("Failed to record login event", err);
  }
}

/** Reads and verifies the session cookie, if any. Returns null when absent/invalid/expired. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.sub, role: payload.role as ProfileRole };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
