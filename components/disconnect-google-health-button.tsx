"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectGoogleHealth } from "@/app/dashboard/actions";

export function DisconnectGoogleHealthButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        "Disconnect Google Health? Your steps will stop syncing until you reconnect, and this Google account will be free to connect to a different PaceVelo profile.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await disconnectGoogleHealth();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Disconnecting…" : "Disconnect"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
