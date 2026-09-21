"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { emailSchema } from "@/lib/validations";

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Password reset is not configured on this server." };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsed.data),
    columns: { id: true },
  });

  // Always report success, whether or not an account exists, so this can't
  // be used to enumerate registered emails.
  if (profile) {
    try {
      const token = await createPasswordResetToken(profile.id);
      const resetUrl = new URL(`/reset-password?token=${token}`, appUrl).toString();
      await sendPasswordResetEmail(parsed.data, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email", err);
    }
  }

  return { success: true };
}
