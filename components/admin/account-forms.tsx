"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { changePassword, type AccountActionState } from "@/app/admin/account/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validations";

const initialState: AccountActionState = {};

export function AccountForms({ email }: { email: string }) {
  const [passwordState, passwordAction] = useActionState(changePassword, initialState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email address</CardTitle>
          <CardDescription>Signed in as {email}. Contact PaceVelo if this needs to change.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                minLength={12}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmNewPassword"
                name="confirmNewPassword"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
            {passwordState.error ? <p className="text-sm text-destructive">{passwordState.error}</p> : null}
            {passwordState.success ? <p className="text-sm text-primary">{passwordState.success}</p> : null}
            <SubmitButton>Update password</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
