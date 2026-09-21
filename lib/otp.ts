import "server-only";

import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

/** Creates and stores a new OTP for `email` (optionally scoped to a challenge invite flow), returning the plaintext code to send. */
export async function createEmailVerification(email: string, challengeId?: string): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  await db.insert(emailVerifications).values({
    email: email.toLowerCase(),
    codeHash,
    challengeId,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
  });

  return code;
}

export type OtpVerifyResult = "valid" | "invalid" | "expired" | "too_many_attempts" | "not_found";

/** Verifies `code` against the most recent unconsumed OTP for this email/challenge pair. */
export async function verifyEmailOtp(
  email: string,
  challengeId: string | undefined,
  code: string,
): Promise<OtpVerifyResult> {
  const normalizedEmail = email.toLowerCase();

  const record = await db.query.emailVerifications.findFirst({
    where: and(
      eq(emailVerifications.email, normalizedEmail),
      challengeId ? eq(emailVerifications.challengeId, challengeId) : isNull(emailVerifications.challengeId),
      isNull(emailVerifications.consumedAt),
    ),
    orderBy: desc(emailVerifications.createdAt),
  });

  if (!record) return "not_found";
  if (record.attempts >= MAX_ATTEMPTS) return "too_many_attempts";
  if (record.expiresAt.getTime() < Date.now()) return "expired";

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    await db
      .update(emailVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerifications.id, record.id));
    return "invalid";
  }

  await db.update(emailVerifications).set({ consumedAt: new Date() }).where(eq(emailVerifications.id, record.id));
  return "valid";
}
