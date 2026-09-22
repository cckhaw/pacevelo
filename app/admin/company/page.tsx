import { eq } from "drizzle-orm";
import { AppNav } from "@/components/nav/app-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyForm } from "@/components/admin/company-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { signOutAdmin } from "@/app/admin/auth-actions";

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { profile } = await requireAdmin();
  const { code } = await searchParams;

  const company = profile.companyId
    ? (await db.query.companies.findFirst({ where: eq(companies.id, profile.companyId) })) ?? null
    : null;

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav
        variant="admin"
        fullName={profile.fullName}
        hasCompany={Boolean(profile.companyId)}
        brandHref="/admin"
        signOutAction={signOutAdmin}
      />
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
            <CompanyForm company={company} defaultOnboardingCode={code} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
