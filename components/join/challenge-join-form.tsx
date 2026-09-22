"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestChallengeOtp, verifyChallengeOtpAndJoin } from "@/app/join/challenge/[challengeId]/actions";
import { PASSWORD_REQUIREMENTS_HINT } from "@/lib/validations";

export function ChallengeJoinForm({
  challengeId,
  emailDomain,
  targetDepartments,
}: {
  challengeId: string;
  emailDomain: string | null;
  targetDepartments: string[] | null;
}) {
  const hasDepartmentOptions = Boolean(targetDepartments && targetDepartments.length > 0);
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await requestChallengeOtp(challengeId, email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsExistingAccount(Boolean(result.existingAccount));
      setStep("verify");
    });
  }

  function handleResend() {
    setError(null);
    startTransition(async () => {
      const result = await requestChallengeOtp(challengeId, email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice("A new code is on its way.");
    });
  }

  function handleVerifyAndJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyChallengeOtpAndJoin(
        challengeId,
        email,
        code,
        password,
        confirmPassword,
        fullName,
        department,
      );
      // A successful join redirects server-side and never returns here.
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={emailDomain ? `you@${emailDomain}` : "you@company.com"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailDomain ? (
            <p className="text-xs text-muted-foreground">Must be an @{emailDomain} address.</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Sending code…" : "Send verification code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyAndJoin} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
      </p>

      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      {!isExistingAccount ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {hasDepartmentOptions ? (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="" disabled>
                  Select your department
                </option>
                {targetDepartments!.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">{isExistingAccount ? "Password" : "Create a password"}</Label>
        <Input
          id="password"
          type="password"
          required
          // Only enforced for a brand-new password - an existing account's
          // password shouldn't be forced through today's policy just to
          // log in, since it may predate it.
          minLength={isExistingAccount ? undefined : 12}
          autoComplete={isExistingAccount ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!isExistingAccount ? <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p> : null}
      </div>

      {!isExistingAccount ? (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-primary">{notice}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Joining…" : "Verify & join challenge"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={handleResend} disabled={isPending}>
        Resend code
      </Button>
    </form>
  );
}
