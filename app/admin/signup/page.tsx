"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { signUpAdmin, type AuthActionState } from "@/app/admin/auth-actions";

const initialState: AuthActionState = {};

export default function AdminSignupPage() {
  const [state, formAction] = useActionState(signUpAdmin, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Set up your company</CardTitle>
          <CardDescription>Launch a branded challenge for your team in under 5 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your full name</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton className="w-full" size="lg">
              Create account
            </SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already set up?{" "}
            <Link href="/admin/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
