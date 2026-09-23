"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/logo";
import { signInBackoffice, type BackofficeLoginState } from "@/app/backoffice/login/actions";

const initialState: BackofficeLoginState = {};

export default function BackofficeLoginPage() {
  const [state, formAction] = useActionState(signInBackoffice, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LogoMark size={48} className="mb-2 rounded-xl" />
          <CardTitle className="text-xl">PaceVelo back office</CardTitle>
          <CardDescription>Internal access only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" required autoComplete="current-password" />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton className="w-full" size="lg">
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
