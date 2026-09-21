import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, LayoutDashboard, Trophy } from "lucide-react";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { LogoMark } from "@/components/logo";
import { getLeaderboardData } from "@/lib/leaderboard-data";
import { getSession } from "@/lib/session";

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

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={24} className="rounded-md" />
            <h1 className="font-semibold">{data.company.name} Leaderboard</h1>
          </div>

          {session?.role === "admin" ? (
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/admin" className="flex items-center gap-1.5 hover:text-foreground">
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </Link>
              <Link href="/admin/challenges" className="flex items-center gap-1.5 hover:text-foreground">
                <Trophy className="h-3.5 w-3.5" /> Challenges
              </Link>
            </nav>
          ) : session?.role === "employee" ? (
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <LayoutDashboard className="h-3.5 w-3.5" /> My dashboard
            </Link>
          ) : null}
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
