import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { AppNav } from "@/components/nav/app-nav";
import { getLeaderboardData } from "@/lib/leaderboard-data";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { signOutAdmin } from "@/app/admin/auth-actions";
import { signOut } from "@/app/login/actions";

export default async function CompanyLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string; challengeId?: string }>;
}) {
  const { slug } = await params;
  const { welcome, challengeId } = await searchParams;
  const [data, session] = await Promise.all([getLeaderboardData(slug, { challengeId }), getSession()]);

  if (!data.company) {
    notFound();
  }

  const profile = session
    ? await db.query.profiles.findFirst({
        where: eq(profiles.id, session.userId),
        columns: { fullName: true, companyId: true },
      })
    : null;

  const navVariant = session?.role === "admin" ? "admin" : session?.role === "employee" ? "employee" : "guest";

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav
        variant={navVariant}
        fullName={profile?.fullName}
        hasCompany={Boolean(profile?.companyId)}
        brandHref={`/company/${slug}`}
        brandLogoUrl={data.company.logoUrl}
        brandLabel={data.company.name}
        title={`${data.company.name} Leaderboard`}
        signOutAction={navVariant === "admin" ? signOutAdmin : navVariant === "employee" ? signOut : undefined}
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {welcome ? (
          <p className="mb-6 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Strava connected! Your workouts will appear here as soon as
            they sync.
          </p>
        ) : null}
        <LeaderboardView slug={slug} initialData={data} />
      </main>
    </div>
  );
}
