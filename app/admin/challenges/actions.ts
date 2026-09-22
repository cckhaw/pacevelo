"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { challenges, companies } from "@/db/schema";
import type { ActivityType, ChallengeDataSource } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { challengeSchema } from "@/lib/validations";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Enforces the company's onboarding-code-granted challenge limit and access
 * expiry. Returns an error string if the challenge can't be created/saved,
 * or null if it's within bounds.
 */
async function checkCompanyLimits(
  companyId: string,
  endDate: Date,
  { countExisting }: { countExisting: boolean },
): Promise<string | null> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { expiresAt: true, challengeLimit: true },
  });
  if (!company) return "Company not found.";

  if (company.expiresAt.getTime() < Date.now()) {
    return `Your company's PaceVelo access expired on ${formatDate(company.expiresAt)}. Contact PaceVelo to renew.`;
  }
  if (endDate.getTime() > company.expiresAt.getTime()) {
    return `The end date can't be after your company's access expires on ${formatDate(company.expiresAt)}.`;
  }

  if (countExisting && company.challengeLimit != null) {
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(challenges)
      .where(eq(challenges.companyId, companyId));
    if (existingCount >= company.challengeLimit) {
      return `You've reached your plan's limit of ${company.challengeLimit} challenge${company.challengeLimit === 1 ? "" : "s"}. Contact PaceVelo to increase it.`;
    }
  }

  return null;
}

export interface ChallengeActionState {
  error?: string;
  warning?: string;
}

async function findOverlappingChallenges(
  companyId: string,
  startDate: Date,
  endDate: Date,
  dataSource: ChallengeDataSource,
  allowedActivities: ActivityType[],
  excludeChallengeId?: string,
) {
  const candidates = await db.query.challenges.findMany({
    where: and(
      eq(challenges.companyId, companyId),
      eq(challenges.isActive, true),
      gte(challenges.endDate, new Date()), // Already-ended challenges can't cause future double-logging.
      lte(challenges.startDate, endDate),
      gte(challenges.endDate, startDate),
      excludeChallengeId ? ne(challenges.id, excludeChallengeId) : undefined,
    ),
  });

  return candidates.filter((c) => {
    // A Strava challenge and a Google Health challenge never double-count
    // the same workout - they're scored from entirely separate telemetry.
    // Two overlapping Google Health challenges, on the other hand, always
    // double-count a shared participant's steps (daily totals aren't split
    // by activity type the way Strava's are), regardless of allowedActivities.
    if (dataSource === "google_health" || c.dataSource === "google_health") {
      return c.dataSource === dataSource;
    }
    return c.allowedActivities.some((activity) => allowedActivities.includes(activity));
  });
}

function parseChallengeForm(formData: FormData) {
  const targetDepartments = String(formData.get("targetDepartments") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  return challengeSchema.safeParse({
    title: formData.get("title"),
    dataSource: formData.get("dataSource"),
    metricType: formData.get("metricType"),
    allowedActivities: formData.getAll("allowedActivities").map(String),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    targetDepartments: targetDepartments.length ? targetDepartments : undefined,
    emailDomain: formData.get("emailDomain"),
  });
}

export async function createChallenge(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    return { error: "Set up your company before creating a challenge." };
  }

  const parsed = parseChallengeForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  const confirmedOverlap = formData.get("confirmOverlap") === "true";

  const limitError = await checkCompanyLimits(profile.companyId, endDate, { countExisting: true });
  if (limitError) {
    return { error: limitError };
  }

  if (!confirmedOverlap) {
    const overlapping = await findOverlappingChallenges(
      profile.companyId,
      startDate,
      endDate,
      parsed.data.dataSource,
      parsed.data.allowedActivities,
    );
    if (overlapping.length > 0) {
      const names = overlapping.map((c) => `"${c.title}"`).join(", ");
      const reason =
        parsed.data.dataSource === "google_health"
          ? "both rank by Google Health steps"
          : `also allows ${overlapping[0].allowedActivities.join("/")}`;
      return {
        warning: `This overlaps with ${names}, which ${reason} in the same window - a participant in both would have the same workout counted twice. Create it anyway?`,
      };
    }
  }

  try {
    await db.insert(challenges).values({
      companyId: profile.companyId,
      title: parsed.data.title,
      dataSource: parsed.data.dataSource,
      metricType: parsed.data.metricType,
      allowedActivities: parsed.data.allowedActivities,
      targetDepartments: parsed.data.targetDepartments ?? null,
      emailDomain: parsed.data.emailDomain,
      startDate,
      endDate,
    });
  } catch (err) {
    console.error("Failed to create challenge", err);
    return { error: "Could not create the challenge." };
  }

  revalidatePath("/admin/challenges");
  redirect("/admin/challenges");
}

export async function updateChallenge(
  challengeId: string,
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const { profile } = await requireAdmin();
  if (!profile.companyId) {
    return { error: "Set up your company first." };
  }

  const existing = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.companyId, profile.companyId)),
  });
  if (!existing) {
    return { error: "Challenge not found." };
  }

  const parsed = parseChallengeForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  const confirmedOverlap = formData.get("confirmOverlap") === "true";

  const limitError = await checkCompanyLimits(profile.companyId, endDate, { countExisting: false });
  if (limitError) {
    return { error: limitError };
  }

  if (!confirmedOverlap) {
    const overlapping = await findOverlappingChallenges(
      profile.companyId,
      startDate,
      endDate,
      existing.dataSource,
      parsed.data.allowedActivities,
      challengeId,
    );
    if (overlapping.length > 0) {
      const names = overlapping.map((c) => `"${c.title}"`).join(", ");
      const reason =
        existing.dataSource === "google_health"
          ? "both rank by Google Health steps"
          : `also allows ${overlapping[0].allowedActivities.join("/")}`;
      return {
        warning: `This overlaps with ${names}, which ${reason} in the same window - a participant in both would have the same workout counted twice. Save anyway?`,
      };
    }
  }

  try {
    await db
      .update(challenges)
      .set({
        title: parsed.data.title,
        // dataSource is fixed at creation - the form doesn't let it change,
        // so it's deliberately left out of this update.
        metricType: parsed.data.metricType,
        allowedActivities: parsed.data.allowedActivities,
        targetDepartments: parsed.data.targetDepartments ?? null,
        emailDomain: parsed.data.emailDomain,
        startDate,
        endDate,
      })
      .where(eq(challenges.id, challengeId));
  } catch (err) {
    console.error("Failed to update challenge", err);
    return { error: "Could not save changes." };
  }

  revalidatePath("/admin/challenges");
  redirect("/admin/challenges");
}

/** Ends a challenge immediately by capping its end date to now, rather than adding a parallel status field. */
export async function endChallengeNow(challengeId: string): Promise<{ error?: string }> {
  const { profile } = await requireAdmin();
  if (!profile.companyId) return { error: "Set up your company first." };

  const existing = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.companyId, profile.companyId)),
    columns: { id: true, startDate: true, endDate: true },
  });
  if (!existing) return { error: "Challenge not found." };

  const now = new Date();
  await db
    .update(challenges)
    .set({ endDate: now < existing.startDate ? existing.startDate : now })
    .where(eq(challenges.id, challengeId));

  revalidatePath("/admin/challenges");
  revalidatePath("/admin/challenges/archive");
  return {};
}
