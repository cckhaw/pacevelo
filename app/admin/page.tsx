import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, count } from "drizzle-orm";
import { Users, Trophy, Plus } from "lucide-react";
import { AppNav } from "@/components/nav/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { companies, profiles, challenges } from "@/db/schema";
import { signOutAdmin } from "@/app/admin/auth-actions";

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }
  const companyId = profile.companyId;

  const [company, [{ value: employeeCount }], [{ value: activeChallengeCount }]] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
    db.select({ value: count() }).from(profiles).where(eq(profiles.companyId, companyId)),
    db
      .select({ value: count() })
      .from(challenges)
      .where(and(eq(challenges.companyId, companyId), gte(challenges.endDate, new Date()))),
  ]);

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="admin" fullName={profile.fullName} hasCompany brandHref="/admin" signOutAction={signOutAdmin} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{company?.name}</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile.fullName.split(" ")[0]}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/company/${company?.slug}`}>View leaderboard</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/challenges/new">
                <Plus className="h-4 w-4" /> New challenge
              </Link>
            </Button>
          </div>
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
              <p className="text-2xl font-semibold">{activeChallengeCount ?? 0}</p>
              <Link href="/admin/challenges" className="text-xs text-primary underline-offset-4 hover:underline">
                View all
              </Link>
            </CardContent>
          </Card>
        </div>

        {!company?.slackWebhookUrl ? (
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
