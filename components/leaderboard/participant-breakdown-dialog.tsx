"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMetricValue, initialsOf } from "@/lib/leaderboard";
import type { ParticipantBreakdown } from "@/lib/leaderboard-data";

// A challenge has no enforced max duration (see lib/validations.ts), so the
// day list can run well past a month - shown a page at a time rather than
// one long scroll, both for usability and to cap how many rows render at
// once for a long-running challenge.
const DAYS_PER_PAGE = 14;

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

  const [visibleCount, setVisibleCount] = useState(DAYS_PER_PAGE);
  // Resets paging back to the first page each time a different participant
  // is opened - this dialog instance stays mounted across opens. Adjusting
  // state during render (React's recommended pattern for "derived from a
  // changed prop") rather than an effect, so there's no extra render before
  // the reset takes effect.
  const [lastProfileId, setLastProfileId] = useState(profileId);
  if (profileId !== lastProfileId) {
    setLastProfileId(profileId);
    setVisibleCount(DAYS_PER_PAGE);
  }

  const maxDayValue = Math.max(1, ...(data?.days.map((d) => d.value) ?? []));
  const sortedDays = data ? [...data.days].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const visibleDays = sortedDays.slice(0, visibleCount);
  const remainingCount = sortedDays.length - visibleDays.length;

  return (
    <Dialog open={profileId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : isError || !data ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Couldn&apos;t load this participant&apos;s progress.</div>
        ) : (
          <>
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                  {initialsOf(data.fullName)}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="truncate">{data.fullName}</DialogTitle>
                  {data.department ? <p className="text-xs text-muted-foreground">{data.department}</p> : null}
                </div>
              </div>
            </DialogHeader>

            <div className="flex shrink-0 items-baseline justify-between rounded-lg border bg-secondary/30 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Total{sortedDays.length > 0 ? ` · ${sortedDays.length} day${sortedDays.length === 1 ? "" : "s"}` : ""}
              </span>
              <span className="text-lg font-semibold tabular-nums">{formatMetricValue(data.totalValue, data.metricType)}</span>
            </div>

            {sortedDays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <ul className="space-y-2.5">
                  {visibleDays.map((day) => (
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

                {remainingCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setVisibleCount((c) => c + DAYS_PER_PAGE)}
                  >
                    Show {Math.min(DAYS_PER_PAGE, remainingCount)} more day{Math.min(DAYS_PER_PAGE, remainingCount) === 1 ? "" : "s"}{" "}
                    ({remainingCount} left)
                  </Button>
                ) : null}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
