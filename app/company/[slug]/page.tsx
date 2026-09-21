import { notFound } from "next/navigation";
import { Activity, CheckCircle2 } from "lucide-react";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getLeaderboardData } from "@/lib/leaderboard-data";

export default async function CompanyLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string; challengeId?: string }>;
}) {
  const { slug } = await params;
  const { welcome, challengeId } = await searchParams;
  const data = await getLeaderboardData(slug, { challengeId });

  if (!data.company) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">{data.company.name} Leaderboard</h1>
        </div>
      </header>
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
