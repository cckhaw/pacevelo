"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { companySchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";

export interface CompanyActionState {
  error?: string;
  success?: boolean;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  base: string,
  excludeCompanyId?: string,
) {
  const candidate = slugify(base);
  for (let attempt = 0; attempt < 6; attempt++) {
    const trySlug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const query = supabase.from("companies").select("id").eq("slug", trySlug);
    const { data } = excludeCompanyId ? await query.neq("id", excludeCompanyId) : await query;
    if (!data || data.length === 0) return trySlug;
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveCompany(
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const { supabase, user, profile } = await requireAdmin();

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    slackWebhookUrl: formData.get("slackWebhookUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const logo = formData.get("logo");
  const hasLogo = logo instanceof File && logo.size > 0;
  if (hasLogo && logo.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be smaller than 2MB" };
  }

  let companyId = profile.company_id;

  if (!companyId) {
    const slug = await uniqueSlug(supabase, parsed.data.name);
    const { data: created, error: insertError } = await supabase
      .from("companies")
      .insert({ name: parsed.data.name, slug, slack_webhook_url: parsed.data.slackWebhookUrl })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: insertError?.message ?? "Could not create company" };
    }
    companyId = created.id;

    const { error: linkError } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", user.id);
    if (linkError) {
      return { error: linkError.message };
    }
  } else {
    const { error: updateError } = await supabase
      .from("companies")
      .update({ name: parsed.data.name, slack_webhook_url: parsed.data.slackWebhookUrl })
      .eq("id", companyId);
    if (updateError) {
      return { error: updateError.message };
    }
  }

  if (hasLogo) {
    const extension = logo.name.split(".").pop() || "png";
    const path = `${companyId}/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, logo, { upsert: true, contentType: logo.type || undefined });

    if (uploadError) {
      return { error: `Company saved, but the logo upload failed: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("company-logos").getPublicUrl(path);

    const { error: logoUpdateError } = await supabase
      .from("companies")
      .update({ logo_url: publicUrl })
      .eq("id", companyId);
    if (logoUpdateError) {
      return { error: logoUpdateError.message };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/company");
  return { success: true };
}
