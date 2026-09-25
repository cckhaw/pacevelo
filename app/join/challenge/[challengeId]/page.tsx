import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeJoinForm } from "@/components/join/challenge-join-form";
import { LogoMark } from "@/components/logo";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import type { ChallengeDataSource } from "@/db/schema";
import { isPast } from "@/lib/time";

const CONNECT_PHRASE: Record<ChallengeDataSource, string> = {
  strava: "connect Strava",
  device_sync: "set up phone sync",
  google_health: "connect Google Health",
};

export default async function JoinChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
    with: { company: true },
  });

  if (!challenge) {
    notFound();
  }

  const hasEnded = isPast(challenge.endDate);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          {challenge.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos are arbitrary user-uploaded URLs
            <img
              src={challenge.company.logoUrl}
              alt={challenge.company.name}
              width={56}
              height={56}
              className="mb-2 rounded-xl object-contain"
            />
          ) : (
            <LogoMark size={56} className="mb-2 rounded-xl" />
          )}
          <CardTitle className="text-xl">{challenge.title}</CardTitle>
          <CardDescription>
            {challenge.company.name} · Verify your work email, set a password, then {CONNECT_PHRASE[challenge.dataSource]}{" "}
            to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasEnded ? (
            <p className="rounded-md border border-muted-foreground/20 bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
              This challenge has already ended.
            </p>
          ) : (
            <ChallengeJoinForm
              challengeId={challenge.id}
              emailDomain={challenge.emailDomain}
              targetDepartments={challenge.targetDepartments}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
