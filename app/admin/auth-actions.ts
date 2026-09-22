"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { onboardingCodes, profiles } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession, clearSession } from "@/lib/session";
import { emailSchema, passwordSchema, passwordsMatch } from "@/lib/validations";

export interface AuthActionState {
  error?: string;
}

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function normalizeOnboardingCode(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim().toUpperCase();
}

async function findUsableOnboardingCode(code: string) {
  if (!code) return null;
  const record = await db.query.onboardingCodes.findFirst({
    where: eq(onboardingCodes.code, code),
    columns: { id: true, usedByCompanyId: true },
  });
  if (!record || record.usedByCompanyId) return null;
  return record;
}

export interface VerifyOnboardingCodeState {
  error?: string;
  valid?: boolean;
  code?: string;
  rawCode?: string;
}

/**
 * Step 1 of "Set up your company": checks the onboarding code before
 * showing the rest of the sign-up form at all, so an HR admin can't fill in
 * their name/email/password only to be told at the end that they never had
 * a valid code. Doesn't consume the code - that still happens atomically
 * with company creation in saveCompany, same as before.
 */
export async function verifyOnboardingCode(
  _prevState: VerifyOnboardingCodeState,
  formData: FormData,
): Promise<VerifyOnboardingCodeState> {
  const rawCode = String(formData.get("onboardingCode") ?? "").trim();
  const code = normalizeOnboardingCode(formData.get("onboardingCode"));
  if (!code) {
    return { error: "Enter the onboarding code PaceVelo gave you.", rawCode };
  }

  const record = await findUsableOnboardingCode(code);
  if (!record) {
    return { error: "That onboarding code isn't valid, or has already been used.", rawCode };
  }

  return { valid: true, code };
}

export async function signUpAdmin(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!fullName) {
    return { error: "Enter your full name" };
  }
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!passwordsMatch(formData.get("password"), formData.get("confirmPassword"))) {
    return { error: "Passwords don't match." };
  }

  // Re-checked here (not just trusted from the verifyOnboardingCode step)
  // since this action can be reached directly - defense in depth against
  // skipping the code-verification step entirely.
  const onboardingCode = normalizeOnboardingCode(formData.get("onboardingCode"));
  const codeRecord = await findUsableOnboardingCode(onboardingCode);
  if (!codeRecord) {
    return { error: "That onboarding code is no longer valid. Please start over." };
  }

  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, parsed.data.email),
    columns: { id: true },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [created] = await db
    .insert(profiles)
    .values({
      email: parsed.data.email,
      passwordHash,
      fullName,
      role: "admin",
    })
    .returning({ id: profiles.id });

  await createSession({ userId: created.id, role: "admin" });
  redirect(`/admin/company?code=${encodeURIComponent(onboardingCode)}`);
}

export async function signOutAdmin() {
  await clearSession();
  redirect("/");
}
