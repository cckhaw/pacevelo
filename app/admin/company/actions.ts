"use server";

import { revalidatePath } from "next/cache";
import { eq, ne, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { companies, profiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { companySchema } from "@/lib/validations";
import { slugify } from "@/lib/slug";

export interface CompanyActionState {
  error?: string;
  success?: boolean;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function uniqueSlug(base: string, excludeCompanyId?: string) {
  const candidate = slugify(base);
  for (let attempt = 0; attempt < 6; attempt++) {
    const trySlug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await db.query.companies.findFirst({
      where: excludeCompanyId
        ? and(eq(companies.slug, trySlug), ne(companies.id, excludeCompanyId))
        : eq(companies.slug, trySlug),
      columns: { id: true },
    });
    if (!existing) return trySlug;
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveCompany(
  _prevState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const { user, profile } = await requireAdmin();

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

  let companyId = profile.companyId;

  try {
    if (!companyId) {
      const slug = await uniqueSlug(parsed.data.name);
      const [created] = await db
        .insert(companies)
        .values({ name: parsed.data.name, slug, slackWebhookUrl: parsed.data.slackWebhookUrl })
        .returning({ id: companies.id });
      companyId = created.id;

      await db.update(profiles).set({ companyId }).where(eq(profiles.id, user.id));
    } else {
      await db
        .update(companies)
        .set({ name: parsed.data.name, slackWebhookUrl: parsed.data.slackWebhookUrl })
        .where(eq(companies.id, companyId));
    }
  } catch (err) {
    console.error("Failed to save company", err);
    return { error: "Could not save company details." };
  }

  if (hasLogo) {
    try {
      const extension = logo.name.split(".").pop() || "png";
      const blob = await put(`company-logos/${companyId}-${Date.now()}.${extension}`, logo, {
        access: "public",
        contentType: logo.type || undefined,
      });
      await db.update(companies).set({ logoUrl: blob.url }).where(eq(companies.id, companyId));
    } catch (err) {
      console.error("Failed to upload logo", err);
      return { error: "Company saved, but the logo upload failed." };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/company");
  return { success: true };
}
