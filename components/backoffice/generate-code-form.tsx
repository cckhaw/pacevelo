"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { generateOnboardingCode, type GenerateOnboardingCodeState } from "@/app/backoffice/actions";

const initialState: GenerateOnboardingCodeState = {};

export function GenerateCodeForm() {
  const [state, formAction] = useActionState(generateOnboardingCode, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="challengeLimit">Challenge limit</Label>
        <Input id="challengeLimit" name="challengeLimit" type="number" min={0} step={1} placeholder="Unlimited" />
        <p className="text-xs text-muted-foreground">Leave blank for unlimited challenges.</p>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.code ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          Code generated: <span className="font-mono font-semibold">{state.code}</span>
        </p>
      ) : null}
      <SubmitButton>Generate code</SubmitButton>
    </form>
  );
}
