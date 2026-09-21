import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, lt } from "drizzle-orm";
import { ArrowLeft, Trophy } from "lucide-react";
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

export default async function ChallengeArchivePage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  const pastChallenges = await db.query.challenges.findMany({
    where: and(eq(challenges.companyId, profile.companyId), lt(challenges.endDate, new Date())),
    orderBy: (c, { desc }) => [desc(c.endDate)],
    with: { company: { columns: { slug: true } } },
  });

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.fullName} hasCompany={Boolean(profile.companyId)} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin/challenges"
              className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to challenges
            </Link>
            <h1 className="text-xl font-semibold">Archive</h1>
          </div>
        </div>

        {pastChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No past challenges yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pastChallenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{challenge.title}</CardTitle>
                      <CardDescription>
                        {formatDate(challenge.startDate)} – {formatDate(challenge.endDate)} ·{" "}
                        {METRIC_TYPE_LABELS[challenge.metricType]}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Ended</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/company/${challenge.company.slug}?challengeId=${challenge.id}`}>
                      <Trophy className="h-3.5 w-3.5" /> Final leaderboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
