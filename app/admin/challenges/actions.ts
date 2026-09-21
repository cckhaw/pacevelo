"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import type { ActivityType } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { challengeSchema } from "@/lib/validations";

export interface ChallengeActionState {
  error?: string;
  warning?: string;
}

async function findOverlappingChallenges(
  companyId: string,
  startDate: Date,
  endDate: Date,
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

  return candidates.filter((c) => c.allowedActivities.some((activity) => allowedActivities.includes(activity)));
}

function parseChallengeForm(formData: FormData) {
  const targetDepartments = String(formData.get("targetDepartments") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  return challengeSchema.safeParse({
    title: formData.get("title"),
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

  if (!confirmedOverlap) {
    const overlapping = await findOverlappingChallenges(
      profile.companyId,
      startDate,
      endDate,
      parsed.data.allowedActivities,
    );
    if (overlapping.length > 0) {
      const names = overlapping.map((c) => `"${c.title}"`).join(", ");
      return {
        warning: `This overlaps with ${names}, which also allows ${overlapping[0].allowedActivities.join("/")} in the same window - a participant in both would have the same workout counted twice. Create it anyway?`,
      };
    }
  }

  try {
    await db.insert(challenges).values({
      companyId: profile.companyId,
      title: parsed.data.title,
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

  if (!confirmedOverlap) {
    const overlapping = await findOverlappingChallenges(
      profile.companyId,
      startDate,
      endDate,
      parsed.data.allowedActivities,
      challengeId,
    );
    if (overlapping.length > 0) {
      const names = overlapping.map((c) => `"${c.title}"`).join(", ");
      return {
        warning: `This overlaps with ${names}, which also allows ${overlapping[0].allowedActivities.join("/")} in the same window - a participant in both would have the same workout counted twice. Save anyway?`,
      };
    }
  }

  try {
    await db
      .update(challenges)
      .set({
        title: parsed.data.title,
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
