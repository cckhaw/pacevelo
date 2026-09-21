import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { METRIC_TYPE_LABELS } from "@/lib/validations";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ChallengesPage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  const companyChallenges = await db.query.challenges.findMany({
    where: eq(challenges.companyId, profile.companyId),
    orderBy: desc(challenges.startDate),
  });

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.fullName} hasCompany={Boolean(profile.companyId)} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Challenges</h1>
          <Button asChild>
            <Link href="/admin/challenges/new">
              <Plus className="h-4 w-4" /> New challenge
            </Link>
          </Button>
        </div>

        {companyChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No challenges yet.{" "}
              <Link href="/admin/challenges/new" className="text-primary underline-offset-4 hover:underline">
                Create your first one
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {companyChallenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{challenge.title}</CardTitle>
                    <Badge variant={challenge.isActive ? "default" : "secondary"}>
                      {challenge.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatDate(challenge.startDate)} – {formatDate(challenge.endDate)} ·{" "}
                    {METRIC_TYPE_LABELS[challenge.metricType]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {challenge.allowedActivities.map((activity) => (
                    <Badge key={activity} variant="outline">
                      {activity}
                    </Badge>
                  ))}
                  {challenge.targetDepartments?.length ? (
                    <span className="ml-2">Targeting: {challenge.targetDepartments.join(", ")}</span>
                  ) : (
                    <span className="ml-2">Open to the whole company</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
