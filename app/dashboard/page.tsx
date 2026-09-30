import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Footprints, Smartphone, Trophy, Watch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { challengeParticipants, profiles } from "@/db/schema";
import { getValidGoogleHealthAccessToken } from "@/lib/google-health/tokens";
import { GOOGLE_HEALTH_ENABLED } from "@/lib/feature-flags";
import { isPast } from "@/lib/time";
import { signOut } from "@/app/login/actions";
import { DisconnectStravaButton } from "@/components/disconnect-strava-button";
import { DisconnectGoogleHealthButton } from "@/components/disconnect-google-health-button";
import { SyncGoogleHealthButton } from "@/components/sync-google-health-button";
import { AppNav } from "@/components/nav/app-nav";

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
  const activeEnrollments = enrollments.filter((e) => !isPast(e.challenge.endDate));
  const endedEnrollments = enrollments.filter((e) => isPast(e.challenge.endDate));

  // Read from our own records rather than calling Strava on every page view:
  // revocations arrive by webhook (or surface when a token refresh is
  // rejected) and clear the stored connection, so this stays accurate.
  const tokenStatus: "connected" | "error" =
    profile.stravaAthleteId && profile.stravaRefreshToken ? "connected" : "error";

  let googleHealthStatus: "connected" | "error" = "error";
  if (profile.googleHealthUserId) {
    try {
      await getValidGoogleHealthAccessToken(profile.id);
      googleHealthStatus = "connected";
    } catch {
      googleHealthStatus = "error";
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="employee" fullName={profile.fullName} brandHref="/dashboard" signOutAction={signOut} />
      <div className="mx-auto max-w-xl px-4 py-10">
        {welcome ? (
          <p className="mb-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Welcome to PaceVelo!{" "}
            {tokenStatus === "connected"
              ? "Your Strava account is connected."
              : googleHealthStatus === "connected"
                ? "Your Google Health account is connected."
                : "Connect Strava below to start syncing."}
          </p>
        ) : null}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{profile.fullName}</CardTitle>
            <CardDescription>
              {profile.company?.name ? `Member of ${profile.company.name}` : "Not yet linked to a company"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between">
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
              {profile.stravaAthleteId ? (
                <div className="mt-2 flex flex-wrap items-start justify-end gap-2">
                  <DisconnectStravaButton />
                </div>
              ) : null}
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

            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/devices">
                <Smartphone className="h-4 w-4" /> Report steps from your phone
              </Link>
            </Button>

            {/* Soft-deprecated (see lib/feature-flags.ts) - still shown for
                whoever already connected it, but no longer offered to
                anyone who hasn't. */}
            {GOOGLE_HEALTH_ENABLED || profile.googleHealthUserId ? (
              <div className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Footprints className="h-4 w-4" /> Google Health connection
                  </span>
                  {googleHealthStatus === "connected" ? (
                    <Badge className="gap-1 bg-primary text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>
                {profile.googleHealthUserId ? (
                  <div className="mt-2 flex flex-wrap items-start justify-end gap-2">
                    <SyncGoogleHealthButton />
                    <DisconnectGoogleHealthButton />
                  </div>
                ) : null}
              </div>
            ) : null}

            {GOOGLE_HEALTH_ENABLED && googleHealthStatus !== "connected" ? (
              <Button asChild variant="outline" className="w-full">
                <a href={`/api/auth/google-health?redirect_to=${encodeURIComponent("/dashboard")}`}>
                  Connect Google Health
                </a>
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
              <>
                {activeEnrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active challenges right now.</p>
                ) : (
                  activeEnrollments.map(({ challenge }) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} companySlug={profile.company?.slug} />
                  ))
                )}
                {endedEnrollments.length > 0 ? (
                  <details className="pt-1 text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Ended challenges ({endedEnrollments.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {endedEnrollments.map(({ challenge }) => (
                        <ChallengeRow key={challenge.id} challenge={challenge} companySlug={profile.company?.slug} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChallengeRow({
  challenge,
  companySlug,
}: {
  challenge: { id: string; title: string; endDate: Date };
  companySlug: string | undefined;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <p className="text-sm font-medium">{challenge.title}</p>
        {isPast(challenge.endDate) ? <Badge variant="secondary">Ended</Badge> : null}
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/company/${companySlug}?challengeId=${challenge.id}`}>
          <Trophy className="h-3.5 w-3.5" /> Leaderboard
        </Link>
      </Button>
    </div>
  );
}
