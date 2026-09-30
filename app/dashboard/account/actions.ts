"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { emailSchema, passwordSchema, passwordsMatch } from "@/lib/validations";
import { createEmailVerification, verifyEmailOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { isPlaceholderEmail } from "@/lib/profile-email";

export interface AccountActionState {
  error?: string;
  success?: string;
  /** Set once a code has been emailed, so the form can move to its second step. */
  codeSentTo?: string;
}

const NOT_SIGNED_IN = "Your session has expired. Please sign in again.";

async function emailTakenByAnother(email: string, profileId: string): Promise<boolean> {
  const other = await db.query.profiles.findFirst({
    where: and(eq(profiles.email, email), ne(profiles.id, profileId)),
    columns: { id: true },
  });
  return Boolean(other);
}

/** Changes the password of an account that already has one. */
export async function changeMyPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: NOT_SIGNED_IN };
  if (!profile.passwordHash) return { error: "This account has no password yet - add one instead." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const parsedNew = passwordSchema.safeParse(formData.get("newPassword"));

  if (!(await verifyPassword(currentPassword, profile.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (!parsedNew.success) return { error: parsedNew.error.issues[0]?.message ?? "Invalid password" };
  if (!passwordsMatch(formData.get("newPassword"), formData.get("confirmNewPassword"))) {
    return { error: "New passwords don't match." };
  }

  await db
    .update(profiles)
    .set({ passwordHash: await hashPassword(parsedNew.data) })
    .where(eq(profiles.id, profile.id));

  return { success: "Password updated." };
}

/** Adds a password to an account that has a real email but no password (e.g. it was created from Strava sign-in). */
export async function addMyPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: NOT_SIGNED_IN };
  if (profile.passwordHash) return { error: "This account already has a password." };
  if (isPlaceholderEmail(profile.email)) return { error: "Add and verify your email address first." };

  const parsedNew = passwordSchema.safeParse(formData.get("newPassword"));
  if (!parsedNew.success) return { error: parsedNew.error.issues[0]?.message ?? "Invalid password" };
  if (!passwordsMatch(formData.get("newPassword"), formData.get("confirmNewPassword"))) {
    return { error: "Passwords don't match." };
  }

  await db
    .update(profiles)
    .set({ passwordHash: await hashPassword(parsedNew.data) })
    .where(eq(profiles.id, profile.id));

  return { success: "Password added. You can now sign in with your email and password." };
}

/** Step 1 for accounts with no usable email: emails a verification code to the address they want to use. */
export async function requestEmailCode(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: NOT_SIGNED_IN };
  if (profile.passwordHash) return { error: "This account already has a password." };

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  const email = parsed.data;

  if (isPlaceholderEmail(email)) return { error: "Enter a real email address." };
  if (await emailTakenByAnother(email, profile.id)) {
    return { error: "That email is already used by another PaceVelo account." };
  }

  try {
    await sendOtpEmail(email, await createEmailVerification(email));
  } catch (error) {
    console.error("Failed to send account email verification code", error);
    return { error: "We couldn't send the code. Please try again." };
  }

  return { codeSentTo: email };
}

/** Step 2: checks the code, then saves the verified email and the new password together. */
export async function verifyEmailAndSetPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: NOT_SIGNED_IN };
  if (profile.passwordHash) return { error: "This account already has a password." };

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) return { error: "Enter a valid email address" };
  const email = parsedEmail.data;
  const codeSentTo = { codeSentTo: email };

  const parsedNew = passwordSchema.safeParse(formData.get("newPassword"));
  if (!parsedNew.success) return { ...codeSentTo, error: parsedNew.error.issues[0]?.message ?? "Invalid password" };
  if (!passwordsMatch(formData.get("newPassword"), formData.get("confirmNewPassword"))) {
    return { ...codeSentTo, error: "Passwords don't match." };
  }

  const result = await verifyEmailOtp(email, undefined, String(formData.get("code") ?? "").trim());
  if (result !== "valid") {
    const messages = {
      invalid: "That code isn't right.",
      expired: "That code has expired. Start again to get a new one.",
      too_many_attempts: "Too many wrong attempts. Start again to get a new code.",
      not_found: "No code found for that email. Start again to get one.",
    } as const;
    return { ...codeSentTo, error: messages[result] };
  }

  if (await emailTakenByAnother(email, profile.id)) {
    return { error: "That email is already used by another PaceVelo account." };
  }

  await db
    .update(profiles)
    .set({ email, passwordHash: await hashPassword(parsedNew.data) })
    .where(eq(profiles.id, profile.id));

  return { success: `Email verified and password added. You can now sign in with ${email} and your password.` };
}
