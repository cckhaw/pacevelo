import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeJoinForm } from "@/components/join/challenge-join-form";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { isPast } from "@/lib/time";

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
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-xl">{challenge.title}</CardTitle>
          <CardDescription>
            {challenge.company.name} · Verify your work email, set a password, then connect Strava to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasEnded ? (
            <p className="rounded-md border border-muted-foreground/20 bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
              This challenge has already ended.
            </p>
          ) : (
            <ChallengeJoinForm challengeId={challenge.id} emailDomain={challenge.emailDomain} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
