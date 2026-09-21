"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/logo";
import { requestPasswordReset, type ForgotPasswordState } from "@/app/forgot-password/actions";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LogoMark size={48} className="mb-2 rounded-xl" />
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>Works for both HR admins and participants.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              If an account exists for that email, we&apos;ve sent instructions to reset your password.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              <SubmitButton className="w-full" size="lg">
                Send reset link
              </SubmitButton>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
