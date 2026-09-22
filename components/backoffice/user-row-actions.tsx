"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserEditDialog } from "@/components/backoffice/user-edit-dialog";
import { UserResetPasswordDialog } from "@/components/backoffice/user-reset-password-dialog";
import { disconnectUserStrava, disconnectUserGoogleHealth, deleteUser } from "@/app/backoffice/companies/[id]/users/actions";
import type { CompanyUserRow } from "@/lib/backoffice-data";

export function UserRowActions({ companyId, user }: { companyId: string; user: CompanyUserRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDisconnectStrava() {
    if (!window.confirm(`Disconnect Strava from ${user.fullName}? They'll need to reconnect to sync workouts again.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await disconnectUserStrava(user.id, companyId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDisconnectGoogleHealth() {
    if (
      !window.confirm(`Disconnect Google Health from ${user.fullName}? They'll need to reconnect to sync steps again.`)
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await disconnectUserGoogleHealth(user.id, companyId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete ${user.fullName} (${user.role})? This permanently removes their account, activity history, and challenge participation. This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id, companyId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <UserEditDialog companyId={companyId} user={user} />
        <UserResetPasswordDialog companyId={companyId} userId={user.id} fullName={user.fullName} />
        {user.stravaConnected ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnectStrava} disabled={isPending}>
            <Unlink className="h-3.5 w-3.5" /> Disconnect Strava
          </Button>
        ) : null}
        {user.googleHealthConnected ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDisconnectGoogleHealth} disabled={isPending}>
            <Unlink className="h-3.5 w-3.5" /> Disconnect Google Health
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
