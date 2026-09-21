"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyPasswordResetToken } from "@/lib/password-reset";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { passwordSchema, passwordsMatch } from "@/lib/validations";

export interface ResetPasswordState {
  error?: string;
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const profileId = await verifyPasswordResetToken(token);
  if (!profileId) {
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
    where: eq(profiles.id, profileId),
    columns: { id: true, role: true },
  });
  if (!profile) {
    return { error: "This account no longer exists." };
  }

  const passwordHash = await hashPassword(parsed.data);
  await db.update(profiles).set({ passwordHash }).where(eq(profiles.id, profile.id));

  await createSession({ userId: profile.id, role: profile.role });
  redirect(profile.role === "admin" ? "/admin" : "/dashboard");
}
