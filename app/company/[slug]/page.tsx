import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getLeaderboardData } from "@/lib/leaderboard-data";

export default async function CompanyLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getLeaderboardData(slug);

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
        <LeaderboardView slug={slug} initialData={data} />
      </main>
    </div>
  );
}
