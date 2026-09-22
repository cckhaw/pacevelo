"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireBackoffice } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";
import { deauthorizeStrava } from "@/lib/strava/client";
import { getValidGoogleHealthAccessToken } from "@/lib/google-health/tokens";
import { revokeGoogleHealthToken } from "@/lib/google-health/client";
import { emailSchema, passwordSchema, passwordsMatch } from "@/lib/validations";

async function loadUserInCompany(profileId: string, companyId: string) {
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.companyId, companyId)),
  });
}

function revalidateUsers(companyId: string) {
  revalidatePath(`/backoffice/companies/${companyId}/users`);
  revalidatePath(`/backoffice/companies/${companyId}`);
  revalidatePath("/backoffice");
}

export interface UpdateUserDetailsState {
  error?: string;
  success?: boolean;
}

export async function updateUserDetails(
  profileId: string,
  companyId: string,
  _prevState: UpdateUserDetailsState,
  formData: FormData,
): Promise<UpdateUserDetailsState> {
  await requireBackoffice();

  const user = await loadUserInCompany(profileId, companyId);
  if (!user) return { error: "User not found in this company." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) return { error: "Enter a name." };

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { error: parsedEmail.error.issues[0]?.message ?? "Invalid email" };
  }

  const department = String(formData.get("department") ?? "").trim();

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsedEmail.data),
    columns: { id: true },
  });
  if (existing && existing.id !== profileId) {
    return { error: "Another account already uses that email." };
  }

  await db
    .update(profiles)
    .set({ fullName, email: parsedEmail.data, department: department || null })
    .where(eq(profiles.id, profileId));

  revalidateUsers(companyId);
  return { success: true };
}

export interface ResetUserPasswordState {
  error?: string;
  success?: boolean;
}

export async function resetUserPassword(
  profileId: string,
  companyId: string,
  _prevState: ResetUserPasswordState,
  formData: FormData,
): Promise<ResetUserPasswordState> {
  await requireBackoffice();

  const user = await loadUserInCompany(profileId, companyId);
  if (!user) return { error: "User not found in this company." };

  const parsed = passwordSchema.safeParse(formData.get("newPassword"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }
  if (!passwordsMatch(formData.get("newPassword"), formData.get("confirmPassword"))) {
    return { error: "Passwords don't match." };
  }

  const passwordHash = await hashPassword(parsed.data);
  await db.update(profiles).set({ passwordHash }).where(eq(profiles.id, profileId));

  return { success: true };
}

export async function disconnectUserStrava(profileId: string, companyId: string): Promise<{ error?: string }> {
  await requireBackoffice();

  const user = await loadUserInCompany(profileId, companyId);
  if (!user) return { error: "User not found in this company." };
  if (!user.stravaAthleteId) return { error: "No Strava account is connected." };

  try {
    const accessToken = await getValidStravaAccessToken(profileId);
    await deauthorizeStrava(accessToken);
  } catch (err) {
    // Still unlink locally even if revoking with Strava fails (e.g. the
    // token was already invalid) - the important part is freeing this
    // athlete id up for a different profile to connect.
    console.error("Failed to revoke Strava access during admin disconnect", err);
  }

  await db
    .update(profiles)
    .set({ stravaAthleteId: null, stravaAccessToken: null, stravaRefreshToken: null, stravaTokenExpiresAt: null })
    .where(eq(profiles.id, profileId));

  revalidateUsers(companyId);
  return {};
}

export async function disconnectUserGoogleHealth(profileId: string, companyId: string): Promise<{ error?: string }> {
  await requireBackoffice();

  const user = await loadUserInCompany(profileId, companyId);
  if (!user) return { error: "User not found in this company." };
  if (!user.googleHealthUserId) return { error: "No Google Health account is connected." };

  try {
    const accessToken = await getValidGoogleHealthAccessToken(profileId);
    await revokeGoogleHealthToken(accessToken);
  } catch (err) {
    // Still unlink locally even if revoking with Google fails (e.g. the
    // token was already invalid) - the important part is freeing this
    // Google account up for a different profile to connect.
    console.error("Failed to revoke Google Health access during admin disconnect", err);
  }

  await db
    .update(profiles)
    .set({
      googleHealthUserId: null,
      googleHealthAccessToken: null,
      googleHealthRefreshToken: null,
      googleHealthTokenExpiresAt: null,
    })
    .where(eq(profiles.id, profileId));

  revalidateUsers(companyId);
  return {};
}

export async function deleteUser(profileId: string, companyId: string): Promise<{ error?: string }> {
  await requireBackoffice();

  const user = await loadUserInCompany(profileId, companyId);
  if (!user) return { error: "User not found in this company." };

  await db.delete(profiles).where(eq(profiles.id, profileId));

  revalidateUsers(companyId);
  return {};
}
