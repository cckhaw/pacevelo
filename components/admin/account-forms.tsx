"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { changeEmail, changePassword, type AccountActionState } from "@/app/admin/account/actions";

const initialState: AccountActionState = {};

export function AccountForms({ email }: { email: string }) {
  const [emailState, emailAction] = useActionState(changeEmail, initialState);
  const [passwordState, passwordAction] = useActionState(changePassword, initialState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email address</CardTitle>
          <CardDescription>Currently signed in as {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={emailAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New email</Label>
              <Input id="newEmail" name="newEmail" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailCurrentPassword">Current password</Label>
              <Input
                id="emailCurrentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {emailState.error ? <p className="text-sm text-destructive">{emailState.error}</p> : null}
            {emailState.success ? <p className="text-sm text-primary">{emailState.success}</p> : null}
            <SubmitButton>Update email</SubmitButton>
          </form>
        </CardContent>
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
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                minLength={8}
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
