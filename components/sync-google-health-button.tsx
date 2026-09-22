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
      setMessage(result.error ?? `Synced ${result.daysSynced ?? 0} day${result.daysSynced === 1 ? "" : "s"} of steps.`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} /> Sync now
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
