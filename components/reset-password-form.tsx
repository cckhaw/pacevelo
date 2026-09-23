"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { resetPassword, type ResetPasswordState } from "@/app/reset-password/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validations";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" required minLength={12} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={12}
          autoComplete="new-password"
        />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full" size="lg">
        Set new password
      </SubmitButton>
    </form>
  );
}
