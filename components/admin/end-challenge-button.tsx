"use client";

import { useState, useTransition } from "react";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endChallengeNow } from "@/app/admin/challenges/actions";

export function EndChallengeButton({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("End this challenge now? Its leaderboard will stop accepting new activity.")) return;
    setError(null);
    startTransition(async () => {
      const result = await endChallengeNow(challengeId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <Square className="h-3.5 w-3.5" /> {isPending ? "Ending…" : "End challenge"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
