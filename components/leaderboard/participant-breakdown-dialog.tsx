"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMetricValue, initialsOf } from "@/lib/leaderboard";
import type { ParticipantBreakdown } from "@/lib/leaderboard-data";

async function fetchParticipantBreakdown(
  slug: string,
  challengeId: string,
  profileId: string,
): Promise<ParticipantBreakdown> {
  const response = await fetch(
    `/api/company/${slug}/leaderboard/participant/${profileId}?challengeId=${challengeId}`,
  );
  if (!response.ok) throw new Error("Failed to load participant breakdown");
  return response.json();
}

function formatDayLabel(dateStr: string) {
  // Appending a UTC time-of-day keeps this reading the same calendar day
  // the API bucketed it into, regardless of the viewer's own timezone.
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Opens when profileId is set - shows that participant's day-by-day progress in the given challenge. */
export function ParticipantBreakdownDialog({
  slug,
  challengeId,
  profileId,
  onOpenChange,
}: {
  slug: string;
  challengeId: string;
  profileId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard-participant", slug, challengeId, profileId],
    queryFn: () => fetchParticipantBreakdown(slug, challengeId, profileId as string),
    enabled: Boolean(profileId),
  });

  const maxDayValue = Math.max(1, ...(data?.days.map((d) => d.value) ?? []));
  const sortedDays = data ? [...data.days].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <Dialog open={profileId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : isError || !data ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Couldn&apos;t load this participant&apos;s progress.</div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Strava-hosted avatar URL
                  <img src={data.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                    {initialsOf(data.fullName)}
                  </span>
                )}
                <div className="min-w-0">
                  <DialogTitle className="truncate">{data.fullName}</DialogTitle>
                  {data.department ? <p className="text-xs text-muted-foreground">{data.department}</p> : null}
                </div>
              </div>
            </DialogHeader>

            <div className="flex items-baseline justify-between rounded-lg border bg-secondary/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">{formatMetricValue(data.totalValue, data.metricType)}</span>
            </div>

            {sortedDays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {sortedDays.map((day) => (
                  <li key={day.date}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{formatDayLabel(day.date)}</span>
                      <span className="tabular-nums font-medium">{formatMetricValue(day.value, data.metricType)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, (day.value / maxDayValue) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
