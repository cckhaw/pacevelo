"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { emailSchema, passwordSchema } from "@/lib/validations";

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

  const passwordHash = await hashPassword(parsedNew.data);
  await db.update(profiles).set({ passwordHash }).where(eq(profiles.id, profile.id));

  return { success: "Password updated." };
}

export async function changeEmail(_prevState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const { profile } = await requireAdmin();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const parsedEmail = emailSchema.safeParse(formData.get("newEmail"));

  if (!profile.passwordHash) {
    return { error: "This account has no password set." };
  }
  if (!(await verifyPassword(currentPassword, profile.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (!parsedEmail.success) {
    return { error: parsedEmail.error.issues[0]?.message ?? "Invalid email" };
  }

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsedEmail.data),
    columns: { id: true },
  });
  if (existing && existing.id !== profile.id) {
    return { error: "Another account already uses that email." };
  }

  await db.update(profiles).set({ email: parsedEmail.data }).where(eq(profiles.id, profile.id));
  revalidatePath("/admin/account");

  return { success: `Email updated to ${parsedEmail.data}.` };
}
