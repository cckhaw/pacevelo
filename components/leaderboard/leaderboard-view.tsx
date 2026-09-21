"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { RefreshCw, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LeaderboardData } from "@/lib/leaderboard-data";
import { METRIC_TYPE_LABELS } from "@/lib/validations";
import type { ActivityType } from "@/db/schema";

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

function formatValue(value: number, metricType: keyof typeof METRIC_TYPE_LABELS) {
  const rounded = metricType === "active_time_mins" ? Math.round(value) : Math.round(value * 10) / 10;
  const unit = metricType === "total_distance_km" ? "km" : metricType === "active_time_mins" ? "min" : "m";
  return `${rounded.toLocaleString()} ${unit}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

  const isDefaultView = challengeId === initialData.activeChallenge?.id && activityType === "all";

  const { data, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["leaderboard", slug, challengeId, activityType],
    queryFn: () => fetchLeaderboard(slug, challengeId, activityType),
    initialData: isDefaultView ? initialData : undefined,
    initialDataUpdatedAt: isDefaultView ? () => Date.now() : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  // Ticks the "updated Xs ago" label without waiting for the next poll.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const view = data ?? initialData;
  const secondsAgo = Math.max(0, Math.round((now - dataUpdatedAt) / 1000));

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
        </div>
      </div>

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
                {view.individual.map((entry, index) => (
                  <li key={entry.profileId} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Strava-hosted avatar URL
                      <img src={entry.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {initials(entry.fullName)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {entry.fullName}
                      {entry.department ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">{entry.department}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatValue(entry.value, metricType)}
                    </span>
                  </li>
                ))}
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
                        {formatValue(dept.value, metricType)} · {dept.memberCount}{" "}
                        {dept.memberCount === 1 ? "person" : "people"}
                      </span>
                    </div>
                    <div
                      className="h-3 w-full overflow-hidden rounded-full bg-secondary"
                      role="img"
                      aria-label={`${dept.department}: ${formatValue(dept.value, metricType)}`}
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
    </div>
  );
}
