import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { Archive, Pencil, Plus, Trophy } from "lucide-react";
import { AppNav } from "@/components/nav/app-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyInviteLinkButton } from "@/components/admin/copy-invite-link-button";
import { EndChallengeButton } from "@/components/admin/end-challenge-button";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { METRIC_TYPE_LABELS } from "@/lib/validations";
import { signOutAdmin } from "@/app/admin/auth-actions";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ChallengesPage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  const currentChallenges = await db.query.challenges.findMany({
    where: and(eq(challenges.companyId, profile.companyId), gte(challenges.endDate, new Date())),
    orderBy: (c, { desc }) => [desc(c.startDate)],
    with: { company: { columns: { slug: true } } },
  });

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav
        variant="admin"
        fullName={profile.fullName}
        hasCompany={Boolean(profile.companyId)}
        brandHref="/admin"
        signOutAction={signOutAdmin}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Challenges</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/challenges/archive">
                <Archive className="h-4 w-4" /> Archive
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/challenges/new">
                <Plus className="h-4 w-4" /> New challenge
              </Link>
            </Button>
          </div>
        </div>

        {currentChallenges.length === 0 ? (
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
            {currentChallenges.map((challenge) => (
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
                    <Badge variant={challenge.isActive ? "default" : "secondary"}>
                      {challenge.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {challenge.dataSource === "google_health" ? (
                      <Badge variant="outline">Google Health</Badge>
                    ) : (
                      challenge.allowedActivities.map((activity) => (
                        <Badge key={activity} variant="outline">
                          {activity}
                        </Badge>
                      ))
                    )}
                    {challenge.targetDepartments?.length ? (
                      <span className="ml-2">Targeting: {challenge.targetDepartments.join(", ")}</span>
                    ) : (
                      <span className="ml-2">Open to the whole company</span>
                    )}
                    {challenge.emailDomain ? <span className="ml-2">@{challenge.emailDomain} only</span> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/company/${challenge.company.slug}?challengeId=${challenge.id}`}>
                        <Trophy className="h-3.5 w-3.5" /> Leaderboard
                      </Link>
                    </Button>
                    <CopyInviteLinkButton path={`/join/challenge/${challenge.id}`} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/challenges/${challenge.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    </Button>
                    <EndChallengeButton challengeId={challenge.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
