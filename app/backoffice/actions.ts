"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireBackoffice } from "@/lib/auth";
import { clearBackofficeSession } from "@/lib/backoffice-session";
import { createOnboardingCode } from "@/lib/onboarding-codes";

export async function signOutBackoffice() {
  await clearBackofficeSession();
  redirect("/backoffice/login");
}

export interface UpdateCompanyLimitsState {
  error?: string;
  success?: boolean;
}

function parseChallengeLimitInput(raw: FormDataEntryValue | null): number | null | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null; // blank = unlimited
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined; // invalid
  return parsed;
}

export async function updateCompanyLimits(
  companyId: string,
  _prevState: UpdateCompanyLimitsState,
  formData: FormData,
): Promise<UpdateCompanyLimitsState> {
  await requireBackoffice();

  const challengeLimit = parseChallengeLimitInput(formData.get("challengeLimit"));
  if (challengeLimit === undefined) {
    return { error: "Challenge limit must be a whole number, or blank for unlimited." };
  }

  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const expiresAt = new Date(expiresAtRaw);
  if (!expiresAtRaw || Number.isNaN(expiresAt.getTime())) {
    return { error: "Enter a valid expiry date." };
  }

  await db.update(companies).set({ challengeLimit, expiresAt }).where(eq(companies.id, companyId));

  revalidatePath(`/backoffice/companies/${companyId}`);
  revalidatePath("/backoffice");
  return { success: true };
}

export interface GenerateOnboardingCodeState {
  error?: string;
  code?: string;
}

export async function generateOnboardingCode(
  _prevState: GenerateOnboardingCodeState,
  formData: FormData,
): Promise<GenerateOnboardingCodeState> {
  await requireBackoffice();

  const challengeLimit = parseChallengeLimitInput(formData.get("challengeLimit"));
  if (challengeLimit === undefined) {
    return { error: "Challenge limit must be a whole number, or blank for unlimited." };
  }

  try {
    const created = await createOnboardingCode(challengeLimit);
    revalidatePath("/backoffice/onboarding-codes");
    return { code: created.code };
  } catch (err) {
    console.error("Failed to generate onboarding code", err);
    return { error: "Could not generate a code. Please try again." };
  }
}
