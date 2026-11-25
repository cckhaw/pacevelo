"use server";

import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPasswordResetToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { getClientIp, consumeRateLimit, safely, tooManyMessage, RATE_RULES } from "@/lib/rate-limit";
import { passwordSchema, passwordsMatch } from "@/lib/validations";

export interface ResetPasswordState {
  error?: string;
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const limited = await safely(
    async () => consumeRateLimit(`reset:ip:${await getClientIp()}`, RATE_RULES.resetIp),
    { ok: true, retryAfterSeconds: 0 },
  );
  if (!limited.ok) return { error: tooManyMessage(limited.retryAfterSeconds) };

  const token = String(formData.get("token") ?? "");
  const claims = await verifyPasswordResetToken(token);
  if (!claims) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }
  if (!passwordsMatch(formData.get("password"), formData.get("confirmPassword"))) {
    return { error: "Passwords don't match." };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, claims.profileId),
    columns: { id: true, role: true, sessionVersion: true },
  });
  if (!profile) {
    return { error: "This account no longer exists." };
  }
  // The link is single-use: any earlier reset or password change bumped the
  // version and killed it.
  if (profile.sessionVersion !== claims.sessionVersion) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data);
  // Conditional on the version we validated against, so two concurrent uses
  // of the same link can't both succeed.
  const updated = await db
    .update(profiles)
    .set({ passwordHash, sessionVersion: sql`${profiles.sessionVersion} + 1` })
    .where(and(eq(profiles.id, profile.id), eq(profiles.sessionVersion, claims.sessionVersion)))
    .returning({ id: profiles.id });
  if (updated.length === 0) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await createSession({ userId: profile.id, role: profile.role });
  redirect(profile.role === "admin" ? "/admin" : "/dashboard");
}
