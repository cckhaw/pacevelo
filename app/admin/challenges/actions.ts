"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { challengeSchema } from "@/lib/validations";

export interface ChallengeActionState {
  error?: string;
}

export async function createChallenge(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const { supabase, profile } = await requireAdmin();

  if (!profile.company_id) {
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

  const { error } = await supabase.from("challenges").insert({
    company_id: profile.company_id,
    title: parsed.data.title,
    metric_type: parsed.data.metricType,
    allowed_activities: parsed.data.allowedActivities,
    target_departments: parsed.data.targetDepartments ?? null,
    start_date: new Date(parsed.data.startDate).toISOString(),
    end_date: new Date(parsed.data.endDate).toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/challenges");
  redirect("/admin/challenges");
}
