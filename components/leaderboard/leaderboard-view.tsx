"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Clock, RefreshCw, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LeaderboardData } from "@/lib/leaderboard-data";
import { formatMetricValue, initialsOf } from "@/lib/leaderboard";
import { METRIC_TYPE_LABELS } from "@/lib/validations";
import type { ActivityType } from "@/db/schema";
import { ParticipantBreakdownDialog } from "@/components/leaderboard/participant-breakdown-dialog";

// Strava's webhook typically lands a new activity within a few seconds, so
// polling this often is what makes the board feel live without standing up
// push infrastructure (websockets/SSE) for an MVP leaderboard.
const POLL_INTERVAL_MS = 8_000;

function timeAgoLabel(secondsAgo: number) {
  if (secondsAgo < 5) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  const minutesAgo = Math.round(secondsAgo / 60);
  return `${minutesAgo}m ago`;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "Ending now";
  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Medals for the podium, plain numbers past 3rd - a small bit of fun for a leaderboard. */
function rankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

async function fetchLeaderboard(
  slug: string,
  challengeId: string | undefined,
  activityType: ActivityType | "all",
): Promise<LeaderboardData> {
  const params = new URLSearchParams();
  if (challengeId) params.set("challengeId", challengeId);
  if (activityType !== "all") params.set("activityType", activityType);
  const query = params.toString();
  const response = await fetch(`/api/company/${slug}/leaderboard${query ? `?${query}` : ""}`);
  if (!response.ok) throw new Error("Failed to load leaderboard");
  return response.json();
}

export function LeaderboardView({ slug, initialData }: { slug: string; initialData: LeaderboardData }) {
  const [challengeId, setChallengeId] = useState<string | undefined>(initialData.activeChallenge?.id);
  const [activityType, setActivityType] = useState<ActivityType | "all">("all");
  const [now, setNow] = useState(() => Date.now());
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const isDefaultView = challengeId === initialData.activeChallenge?.id && activityType === "all";

  const { data, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["leaderboard", slug, challengeId, activityType],
    queryFn: () => fetchLeaderboard(slug, challengeId, activityType),
    initialData: isDefaultView ? initialData : undefined,
    initialDataUpdatedAt: isDefaultView ? () => Date.now() : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const activeChallenge = query.state.data?.activeChallenge;
      if (!activeChallenge) return POLL_INTERVAL_MS;
      return new Date(activeChallenge.endDate).getTime() < Date.now() ? false : POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: true,
  });

  // Ticks the "updated Xs ago" label without waiting for the next poll.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const view = data ?? initialData;
  const secondsAgo = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));
  const countdownMs = view.activeChallenge ? new Date(view.activeChallenge.endDate).getTime() - now : 0;
  const hasEnded = view.activeChallenge ? countdownMs < 0 : false;

  if (!view.activeChallenge) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active challenge right now. Check back once your company launches one.
        </CardContent>
      </Card>
    );
  }

  const metricType = view.activeChallenge.metricType;
  const prizes = view.activeChallenge.prizes;
  const maxDeptValue = Math.max(1, ...view.departmental.map((d) => d.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{view.activeChallenge.title}</h2>
          <p className="text-sm text-muted-foreground">Ranked by {METRIC_TYPE_LABELS[metricType].toLowerCase()}</p>
        </div>

        <div className="flex items-center gap-3">
          {view.challenges.length > 1 ? (
            <select
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {view.challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          ) : null}

          {hasEnded ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/50" />
              Challenge ended
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Live · updated {timeAgoLabel(secondsAgo)}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh leaderboard now"
                title="Just synced a workout? Refresh now."
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </>
          )}
        </div>
      </div>

      {!hasEnded || prizes.length > 0 ? (
        <div className="space-y-3">
          {!hasEnded ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold text-primary">{formatCountdown(countdownMs)} left</span>
              {prizes.length > 0 ? (
                <span className="text-sm text-muted-foreground">— can you make the podium?</span>
              ) : null}
            </div>
          ) : null}

          {prizes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Up for grabs:
              </span>
              {prizes.map((prize, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium"
                >
                  <span>{rankBadge(i + 1)}</span> {prize}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {view.activeChallenge.allowedActivities.length > 0 ? (
        <Tabs value={activityType} onValueChange={(v) => setActivityType(v as ActivityType | "all")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {view.activeChallenge.allowedActivities.map((activity) => (
              <TabsTrigger key={activity} value={activity}>
                {activity}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" /> Individual standings
            </CardTitle>
            <CardDescription>Top performers in this challenge</CardDescription>
          </CardHeader>
          <CardContent>
            {view.individual.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <ol className="space-y-3">
                {view.individual.map((entry, index) => {
                  const prize = !hasEnded ? prizes[index] : undefined;
                  const canDrillDown = entry.value > 0;
                  const rowContent = (
                    <>
                      <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
                        {rankBadge(index + 1)}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {initialsOf(entry.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {entry.fullName}
                          {entry.department ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">{entry.department}</span>
                          ) : null}
                        </p>
                        {prize ? (
                          <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Trophy className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>In the running for {prize}</span>
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMetricValue(entry.value, metricType)}
                      </span>
                    </>
                  );
                  return (
                    <li key={entry.profileId}>
                      {canDrillDown ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProfileId(entry.profileId)}
                          className="flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-secondary/50"
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-1">{rowContent}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Departmental battle
            </CardTitle>
            <CardDescription>Aggregated by department</CardDescription>
          </CardHeader>
          <CardContent>
            {view.departmental.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <ul className="space-y-4">
                {view.departmental.map((dept) => (
                  <li key={dept.department}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium">{dept.department}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMetricValue(dept.value, metricType)} · {dept.memberCount}{" "}
                        {dept.memberCount === 1 ? "person" : "people"}
                      </span>
                    </div>
                    <div
                      className="h-3 w-full overflow-hidden rounded-full bg-secondary"
                      role="img"
                      aria-label={`${dept.department}: ${formatMetricValue(dept.value, metricType)}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${Math.max(4, (dept.value / maxDeptValue) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ParticipantBreakdownDialog
        slug={slug}
        challengeId={view.activeChallenge.id}
        profileId={selectedProfileId}
        onOpenChange={(open) => {
          if (!open) setSelectedProfileId(null);
        }}
      />
    </div>
  );
}
