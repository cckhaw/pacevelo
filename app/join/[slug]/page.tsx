import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { Activity, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { challenges, companies } from "@/db/schema";

// Each challenge has its own dedicated invite link (/join/challenge/[id]) so
// enrollment - and therefore who a synced activity counts toward - is
// explicit. This page is the company-level landing spot: a directory of
// whatever challenges are currently open to join.
export default async function JoinCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    columns: { id: true, name: true, slug: true, logoUrl: true },
  });

  if (!company) {
    notFound();
  }

  const joinableChallenges = await db.query.challenges.findMany({
    where: and(eq(challenges.companyId, company.id), eq(challenges.isActive, true), gte(challenges.endDate, new Date())),
    orderBy: (c, { desc }) => [desc(c.startDate)],
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos are arbitrary user-uploaded URLs
            <img
              src={company.logoUrl}
              alt={company.name}
              width={56}
              height={56}
              className="mb-2 rounded-xl object-contain"
            />
          ) : (
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-xl">Join a challenge at {company.name}</CardTitle>
          <CardDescription>Pick a challenge below to sign up and connect Strava.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {joinableChallenges.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No challenges are open to join right now. Check back soon.
            </p>
          ) : (
            joinableChallenges.map((challenge) => (
              <Button key={challenge.id} asChild variant="outline" size="lg" className="w-full justify-between">
                <Link href={`/join/challenge/${challenge.id}`}>
                  {challenge.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))
          )}

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/login">
              <Trophy className="h-4 w-4" /> Already signed up? Log in
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
