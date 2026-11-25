"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordSchema, passwordsMatch } from "@/lib/validations";

export interface AccountActionState {
  error?: string;
  success?: string;
}

export async function changePassword(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const { profile } = await requireAdmin();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const parsedNew = passwordSchema.safeParse(formData.get("newPassword"));

  if (!profile.passwordHash) {
    return { error: "This account has no password set." };
  }
  if (!(await verifyPassword(currentPassword, profile.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (!parsedNew.success) {
    return { error: parsedNew.error.issues[0]?.message ?? "Invalid password" };
  }
  if (!passwordsMatch(formData.get("newPassword"), formData.get("confirmNewPassword"))) {
    return { error: "New passwords don't match." };
  }

  const passwordHash = await hashPassword(parsedNew.data);
  await db
    .update(profiles)
    .set({ passwordHash, sessionVersion: sql`${profiles.sessionVersion} + 1` })
    .where(eq(profiles.id, profile.id));
  // Signs out every other session; keep this one.
  await createSession({ userId: profile.id, role: profile.role }, { recordLogin: false });

  return { success: "Password updated." };
}
