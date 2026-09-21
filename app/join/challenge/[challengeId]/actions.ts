"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { challengeParticipants, challenges, profiles } from "@/db/schema";
import { sendOtpEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createEmailVerification, verifyEmailOtp } from "@/lib/otp";
import { createSession } from "@/lib/session";
import { emailSchema, passwordSchema } from "@/lib/validations";

export interface RequestOtpResult {
  error?: string;
  existingAccount?: boolean;
}

async function loadJoinableChallenge(challengeId: string) {
  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    with: { company: true },
  });
  if (!challenge) return { error: "Challenge not found." } as const;
  if (challenge.endDate.getTime() < Date.now()) {
    return { error: "This challenge has already ended." } as const;
  }
  return { challenge } as const;
}

export async function requestChallengeOtp(challengeId: string, rawEmail: string): Promise<RequestOtpResult> {
  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { error: parsedEmail.error.issues[0]?.message ?? "Enter a valid email address" };
  }
  const email = parsedEmail.data;

  const loaded = await loadJoinableChallenge(challengeId);
  if ("error" in loaded) return { error: loaded.error };
  const { challenge } = loaded;

  if (challenge.emailDomain) {
    const domain = email.split("@")[1];
    if (domain !== challenge.emailDomain) {
      return { error: `Use your @${challenge.emailDomain} work email to join this challenge.` };
    }
  }

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, email),
    columns: { passwordHash: true },
  });

  const code = await createEmailVerification(email, challengeId);
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("Failed to send OTP email", err);
    return { error: "Could not send the verification email. Please try again in a moment." };
  }

  return { existingAccount: Boolean(existing?.passwordHash) };
}

export interface VerifyAndJoinResult {
  error?: string;
}

export async function verifyChallengeOtpAndJoin(
  challengeId: string,
  rawEmail: string,
  code: string,
  password: string,
  fullName: string,
  department: string,
): Promise<VerifyAndJoinResult> {
  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { error: parsedEmail.error.issues[0]?.message ?? "Enter a valid email address" };
  }
  const email = parsedEmail.data;

  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? "Invalid password" };
  }

  const loaded = await loadJoinableChallenge(challengeId);
  if ("error" in loaded) return { error: loaded.error };
  const { challenge } = loaded;

  const otpResult = await verifyEmailOtp(email, challengeId, trimmedCode);
  if (otpResult === "not_found") return { error: "Request a new code and try again." };
  if (otpResult === "expired") return { error: "That code expired. Request a new one." };
  if (otpResult === "too_many_attempts") return { error: "Too many attempts. Request a new code." };
  if (otpResult === "invalid") return { error: "That code isn't right." };

  let profile = await db.query.profiles.findFirst({ where: eq(profiles.email, email) });

  if (profile?.passwordHash) {
    const valid = await verifyPassword(parsedPassword.data, profile.passwordHash);
    if (!valid) return { error: "Incorrect password for this account." };
  } else {
    const passwordHash = await hashPassword(parsedPassword.data);
    const trimmedName = fullName.trim();
    if (!profile && !trimmedName) {
      return { error: "Enter your name." };
    }

    if (profile) {
      await db.update(profiles).set({ passwordHash }).where(eq(profiles.id, profile.id));
    } else {
      const [created] = await db
        .insert(profiles)
        .values({
          email,
          passwordHash,
          fullName: trimmedName,
          department: department.trim() || null,
          role: "employee",
          companyId: challenge.companyId,
        })
        .returning();
      profile = created;
    }
  }

  if (!profile) {
    return { error: "Something went wrong creating your account. Please try again." };
  }

  await createSession({ userId: profile.id, role: profile.role });

  await db
    .insert(challengeParticipants)
    .values({ challengeId, profileId: profile.id })
    .onConflictDoNothing({ target: [challengeParticipants.challengeId, challengeParticipants.profileId] });

  const destination = `/company/${challenge.company.slug}?welcome=1`;

  if (profile.stravaAthleteId) {
    redirect(destination);
  }
  redirect(
    `/api/auth/strava?company=${encodeURIComponent(challenge.company.slug)}&redirect_to=${encodeURIComponent(destination)}`,
  );
}
