import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Trophy, Plus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteLinkCard } from "@/components/admin/invite-link-card";
import { requireAdmin } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const { supabase, profile } = await requireAdmin();

  if (!profile.company_id) {
    redirect("/admin/company");
  }

  const [{ data: company }, { count: employeeCount }, { count: challengeCount }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", profile.company_id).single(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id),
    supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id),
  ]);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${company?.slug}`;

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.full_name} hasCompany />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{company?.name}</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile.full_name.split(" ")[0]}.</p>
          </div>
          <Button asChild>
            <Link href="/admin/challenges/new">
              <Plus className="h-4 w-4" /> New challenge
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Employees joined</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{employeeCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Challenges</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{challengeCount ?? 0}</p>
              <Link href="/admin/challenges" className="text-xs text-primary underline-offset-4 hover:underline">
                View all
              </Link>
            </CardContent>
          </Card>
        </div>

        <InviteLinkCard inviteUrl={inviteUrl} />

        {!company?.slack_webhook_url ? (
          <Card>
            <CardHeader>
              <CardDescription>
                Tip: add a Slack webhook in{" "}
                <Link href="/admin/company" className="text-primary underline-offset-4 hover:underline">
                  Company settings
                </Link>{" "}
                to get automated leaderboard updates.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
