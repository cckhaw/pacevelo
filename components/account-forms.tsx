"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import {
  addMyPassword,
  changeMyPassword,
  requestEmailCode,
  verifyEmailAndSetPassword,
  type AccountActionState,
} from "@/app/dashboard/account/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validations";

const initialState: AccountActionState = {};

function Feedback({ state }: { state: AccountActionState }) {
  return (
    <>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
    </>
  );
}

function NewPasswordFields() {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput id="newPassword" name="newPassword" required minLength={12} autoComplete="new-password" />
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
    </>
  );
}

function ChangePasswordForm() {
  const [state, action] = useActionState(changeMyPassword, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" />
      </div>
      <NewPasswordFields />
      <Feedback state={state} />
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}

function AddPasswordForm() {
  const [state, action] = useActionState(addMyPassword, initialState);
  return (
    <form action={action} className="space-y-4">
      <NewPasswordFields />
      <Feedback state={state} />
      <SubmitButton>Add password</SubmitButton>
    </form>
  );
}

/** No real email on file yet: verify one by code, and set the password in the same step. */
function AddEmailAndPasswordForm() {
  const [codeState, requestAction] = useActionState(requestEmailCode, initialState);
  const [verifyState, verifyAction] = useActionState(verifyEmailAndSetPassword, initialState);

  const sentTo = verifyState.codeSentTo ?? codeState.codeSentTo;

  if (verifyState.success) {
    return <p className="text-sm text-primary">{verifyState.success}</p>;
  }

  if (!sentTo) {
    return (
      <form action={requestAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          <p className="text-xs text-muted-foreground">
            We&apos;ll email a 6-digit code to confirm it. You&apos;ll use this email and your password to sign in.
          </p>
        </div>
        <Feedback state={codeState} />
        <SubmitButton>Send verification code</SubmitButton>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="email" value={sentTo} />
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{sentTo}</span>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
        />
      </div>
      <NewPasswordFields />
      <Feedback state={verifyState} />
      <SubmitButton>Verify and add password</SubmitButton>
    </form>
  );
}

export type PasswordMode = "change" | "add" | "add-email";

export function AccountForms({ email, mode }: { email: string | null; mode: PasswordMode }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email address</CardTitle>
          <CardDescription>
            {email ? `Signed in as ${email}.` : "No email address on file yet - add one below to enable password sign-in."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "change" ? "Change password" : mode === "add" ? "Add a password" : "Add email and password"}
          </CardTitle>
          <CardDescription>
            {mode === "change"
              ? "Choose a strong password you don't use elsewhere."
              : "Optional. Lets you sign in with your email and password as well as through Strava."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "change" ? <ChangePasswordForm /> : mode === "add" ? <AddPasswordForm /> : <AddEmailAndPasswordForm />}
        </CardContent>
      </Card>
    </div>
  );
}
