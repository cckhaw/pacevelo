"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncGoogleHealthSteps } from "@/app/dashboard/actions";

/** Google Health has no webhook push like Strava does, so this is the stand-in for "sync now" between the periodic cron runs. */
export function SyncGoogleHealthButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncGoogleHealthSteps();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const daysSynced = result.daysSynced ?? 0;
      let text = `Synced ${daysSynced} day${daysSynced === 1 ? "" : "s"} of steps.`;
      // Diagnostics - tells apart "nothing synced to Google Health yet"
      // from "data came back but this app can't read its value field".
      if (daysSynced === 0) {
        text +=
          result.rollupBucketCount === 0
            ? " Google Health returned no data for the last 30 days - check that steps are actually being recorded/synced to Google Health on your phone."
            : ` Google returned ${result.rollupBucketCount} day(s) of rollup data but none had a readable step count - sample: ${JSON.stringify(result.sampleRollupPoint)}`;
      } else {
        text += ` (${result.rollupBucketCount} day(s) of rollup data from Google.)`;
      }
      setMessage(text);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} /> Sync now
      </Button>
      {message ? <p className="max-w-xs break-words text-right text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
