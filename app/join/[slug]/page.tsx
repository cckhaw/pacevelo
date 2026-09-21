import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies } from "@/db/schema";

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

  const stravaHref = `/api/auth/strava?company=${encodeURIComponent(company.slug)}&redirect_to=${encodeURIComponent(
    "/dashboard",
  )}`;

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
          <CardTitle className="text-xl">Join {company.name} on PaceVelo</CardTitle>
          <CardDescription>
            Connect your Strava account to join your company&apos;s challenge and appear on the leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild size="lg" className="w-full bg-[#FC4C02] text-white hover:bg-[#e04502]">
            <a href={stravaHref}>Connect with Strava</a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We only read your activity data (type, distance, time, elevation) — never your Strava password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
