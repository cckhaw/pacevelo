"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/logo";
import { signInAdmin, type AuthActionState } from "@/app/admin/auth-actions";

const initialState: AuthActionState = {};

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(signInAdmin, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LogoMark size={48} className="mb-2 rounded-xl" />
          <CardTitle className="text-xl">HR Admin sign in</CardTitle>
          <CardDescription>Manage your company&apos;s challenges and roster.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton className="w-full" size="lg">
              Sign in
            </SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to PaceVelo?{" "}
            <Link href="/admin/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Set up your company
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline">
              I&apos;m an employee
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
