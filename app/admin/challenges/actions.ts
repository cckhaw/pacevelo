"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { challengeSchema } from "@/lib/validations";

export interface ChallengeActionState {
  error?: string;
}

export async function createChallenge(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    return { error: "Set up your company before creating a challenge." };
  }

  const targetDepartments = String(formData.get("targetDepartments") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const parsed = challengeSchema.safeParse({
    title: formData.get("title"),
    metricType: formData.get("metricType"),
    allowedActivities: formData.getAll("allowedActivities").map(String),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    targetDepartments: targetDepartments.length ? targetDepartments : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db.insert(challenges).values({
      companyId: profile.companyId,
      title: parsed.data.title,
      metricType: parsed.data.metricType,
      allowedActivities: parsed.data.allowedActivities,
      targetDepartments: parsed.data.targetDepartments ?? null,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    });
  } catch (err) {
    console.error("Failed to create challenge", err);
    return { error: "Could not create the challenge." };
  }

  revalidatePath("/admin/challenges");
  redirect("/admin/challenges");
}
