import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Trophy, Watch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { challengeParticipants, profiles } from "@/db/schema";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";
import { isPast } from "@/lib/time";
import { signOut } from "@/app/login/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    with: { company: true },
  });

  if (!profile) {
    redirect("/login");
  }

  const enrollments = await db.query.challengeParticipants.findMany({
    where: eq(challengeParticipants.profileId, profile.id),
    orderBy: (t, { desc }) => [desc(t.joinedAt)],
    with: { challenge: { columns: { id: true, title: true, isActive: true, endDate: true } } },
  });

  let tokenStatus: "connected" | "error" = "error";
  if (profile.stravaAthleteId) {
    try {
      await getValidStravaAccessToken(profile.id);
      tokenStatus = "connected";
    } catch {
      tokenStatus = "error";
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {welcome ? (
        <p className="mb-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Welcome to PaceVelo! Your Strava account is connected.
        </p>
      ) : null}

      <Card className="mb-6">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">{profile.fullName}</CardTitle>
            <CardDescription>
              {profile.company?.name ? `Member of ${profile.company.name}` : "Not yet linked to a company"}
            </CardDescription>
          </div>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="flex items-center gap-2 text-sm">
              <Watch className="h-4 w-4" /> Strava connection
            </span>
            {tokenStatus === "connected" ? (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>

          {profile.department ? (
            <div className="rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Department: </span>
              {profile.department}
            </div>
          ) : null}

          {tokenStatus !== "connected" ? (
            <Button asChild className="w-full bg-[#FC4C02] text-white hover:bg-[#e04502]">
              <a href={`/api/auth/strava?redirect_to=${encodeURIComponent("/dashboard")}`}>Connect Strava</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your challenges</CardTitle>
          <CardDescription>Every challenge you&apos;ve joined.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask your HR admin for a challenge invite link to get started.
            </p>
          ) : (
            enrollments.map(({ challenge }) => {
              const hasEnded = isPast(challenge.endDate);
              return (
                <div key={challenge.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{challenge.title}</p>
                    {hasEnded ? <Badge variant="secondary">Ended</Badge> : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/company/${profile.company?.slug}?challengeId=${challenge.id}`}>
                      <Trophy className="h-3.5 w-3.5" /> Leaderboard
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
