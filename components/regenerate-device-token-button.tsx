"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateDeviceSyncTokenAction } from "@/app/dashboard/devices/actions";

/** Issues a fresh token and reloads the page so every URL/QR code on it reflects the new value. */
export function RegenerateDeviceTokenButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        "Get a new setup link? Your existing iOS Shortcut or Android app will stop working until you set it up again with the new link.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await regenerateDeviceSyncTokenAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <RefreshCw className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Get a new setup link
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
