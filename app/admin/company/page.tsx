import { eq } from "drizzle-orm";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyForm } from "@/components/admin/company-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { companies } from "@/db/schema";

export default async function CompanySettingsPage() {
  const { profile } = await requireAdmin();

  const company = profile.companyId
    ? (await db.query.companies.findFirst({ where: eq(companies.id, profile.companyId) })) ?? null
    : null;

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.fullName} hasCompany={Boolean(profile.companyId)} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{company ? "Company settings" : "Set up your company"}</CardTitle>
            <CardDescription>
              {company
                ? "Update your branding and Slack notifications."
                : "This takes under a minute — you can always change it later."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyForm company={company} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
