"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession, clearSession } from "@/lib/session";
import {
  getClientIp,
  consumeRateLimit,
  isRateLimited,
  resetRateLimit,
  accountKey,
  safely,
  tooManyMessage,
  RATE_RULES,
} from "@/lib/rate-limit";
import { emailSchema, loginPasswordSchema } from "@/lib/validations";

export interface LoginActionState {
  error?: string;
}

// bcrypt hash (cost 12) of a random value; only ever compared against to equalise timing.
const DUMMY_HASH = "$2b$12$0MgCwovkjA1EczmAfXcUEeEmpR8p6SYbHqTJvs4gvUJFDB2qlGv76";

const credentialsSchema = z.object({ email: emailSchema, password: loginPasswordSchema });

export async function signIn(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ip = await getClientIp();
  const failureKey = accountKey("login:fail", parsed.data.email);
  const open = { ok: true, retryAfterSeconds: 0 };
  const ipCheck = await safely(() => consumeRateLimit(`login:ip:${ip}`, RATE_RULES.loginIp), open);
  const lockCheck = await safely(() => isRateLimited(failureKey, RATE_RULES.loginAccountFailures), open);
  if (!ipCheck.ok || !lockCheck.ok) {
    return { error: tooManyMessage(Math.max(ipCheck.retryAfterSeconds, lockCheck.retryAfterSeconds)) };
  }

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.email, parsed.data.email) });
  // Always run a bcrypt compare (against a throwaway hash for unknown
  // accounts) so response time doesn't reveal whether an email is registered.
  const valid = await verifyPassword(parsed.data.password, profile?.passwordHash ?? DUMMY_HASH);
  if (!profile?.passwordHash || !valid) {
    await safely(() => consumeRateLimit(failureKey, RATE_RULES.loginAccountFailures), open);
    return { error: "Incorrect email or password." };
  }
  await safely(() => resetRateLimit(failureKey), undefined);

  await createSession({ userId: profile.id, role: profile.role });
  redirect(profile.role === "admin" ? "/admin" : "/dashboard");
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

/**
 * Clears the current session and starts a fresh Strava connect - used when
 * someone is signed into one account but the Strava account they just
 * authorized belongs to a different, password-less profile. Signing out
 * first means the callback no longer sees an existing session to conflict
 * with, so it logs them straight into the Strava-linked profile instead.
 */
export async function signOutAndReconnectStrava() {
  await clearSession();
  redirect("/api/auth/strava");
}

/** Same as signOutAndReconnectStrava, for the Google Health equivalent conflict. */
export async function signOutAndReconnectGoogleHealth() {
  await clearSession();
  redirect("/api/auth/google-health");
}
