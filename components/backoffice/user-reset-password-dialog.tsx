"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { resetUserPassword, type ResetUserPasswordState } from "@/app/backoffice/companies/[id]/users/actions";

const initialState: ResetUserPasswordState = {};

export function UserResetPasswordDialog({
  companyId,
  userId,
  fullName,
}: {
  companyId: string;
  userId: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(resetUserPassword.bind(null, userId, companyId), initialState);

  // Closes the dialog once the action succeeds, tracked during render (per
  // React's "adjusting state when a prop changes" pattern) instead of an
  // effect, so there's no extra render/flash before the dialog dismisses.
  // Compares the whole state object (not just .success) since useActionState
  // returns a fresh object on every completion, including repeat successes.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <KeyRound className="h-3.5 w-3.5" /> Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Sets a new password for {fullName} directly. Share it with them securely.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <SubmitButton>Set password</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
