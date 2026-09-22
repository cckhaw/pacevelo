"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { LogoInline, LogoMark } from "@/components/logo";
import {
  signUpAdmin,
  verifyOnboardingCode,
  type AuthActionState,
  type VerifyOnboardingCodeState,
} from "@/app/admin/auth-actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validations";

const initialCodeState: VerifyOnboardingCodeState = {};
const initialSignupState: AuthActionState = {};

function AuthCardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="flex items-center justify-end px-4 py-4 sm:px-6">
        <Link href="/">
          <LogoInline markSize={32} />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <LogoMark size={48} className="mb-2 rounded-xl" />
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminSignupPage() {
  const [codeState, verifyCodeAction] = useActionState(verifyOnboardingCode, initialCodeState);
  const [signupState, signupAction] = useActionState(signUpAdmin, initialSignupState);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);

  // Advances to the account-details step once the code is verified, tracked
  // during render (per React's "adjust state when a prop/input changes"
  // pattern) rather than an effect, so there's no extra render before the
  // step switches. Compares the whole state object (not just .valid) since
  // useActionState returns a fresh object on every completion.
  const [handledCodeState, setHandledCodeState] = useState(codeState);
  if (codeState !== handledCodeState) {
    setHandledCodeState(codeState);
    if (codeState.valid && codeState.code) setVerifiedCode(codeState.code);
  }

  if (!verifiedCode) {
    return (
      <AuthCardShell title="Set up your company" description="Enter the onboarding code PaceVelo gave you to get started.">
        <form action={verifyCodeAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboardingCode">Onboarding code</Label>
            <Input
              id="onboardingCode"
              name="onboardingCode"
              required
              placeholder="e.g. AB12CD34EF"
              className="uppercase"
              autoCapitalize="characters"
              defaultValue={codeState.rawCode ?? ""}
            />
          </div>
          {codeState.error ? <p className="text-sm text-destructive">{codeState.error}</p> : null}
          <SubmitButton className="w-full" size="lg">
            Continue
          </SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have a code?{" "}
          <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
            Contact PaceVelo
          </Link>{" "}
          to find out more.
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Already set up?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell title="Create your account" description="Code verified — now set up your login.">
      <form action={signupAction} className="space-y-4">
        <input type="hidden" name="onboardingCode" value={verifiedCode} />
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
          <Input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </div>
        {signupState.error ? <p className="text-sm text-destructive">{signupState.error}</p> : null}
        <SubmitButton className="w-full" size="lg">
          Create account
        </SubmitButton>
      </form>

      <button
        type="button"
        onClick={() => setVerifiedCode(null)}
        className="mt-3 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Use a different code
      </button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already set up?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account, you agree to PaceVelo&apos;s{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthCardShell>
  );
}
