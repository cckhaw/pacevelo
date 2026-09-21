import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyForm } from "@/components/admin/company-form";
import { requireAdmin } from "@/lib/auth";

export default async function CompanySettingsPage() {
  const { supabase, profile } = await requireAdmin();

  const company = profile.company_id
    ? (await supabase.from("companies").select("*").eq("id", profile.company_id).single()).data
    : null;

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.full_name} hasCompany={Boolean(profile.company_id)} />
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
