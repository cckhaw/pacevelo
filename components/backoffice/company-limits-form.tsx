"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { updateCompanyLimits, type UpdateCompanyLimitsState } from "@/app/backoffice/actions";

const initialState: UpdateCompanyLimitsState = {};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function CompanyLimitsForm({
  companyId,
  challengeLimit,
  expiresAt,
}: {
  companyId: string;
  challengeLimit: number | null;
  expiresAt: Date;
}) {
  const [state, formAction] = useActionState(updateCompanyLimits.bind(null, companyId), initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="challengeLimit">Challenge limit</Label>
        <Input
          id="challengeLimit"
          name="challengeLimit"
          type="number"
          min={0}
          step={1}
          defaultValue={challengeLimit ?? ""}
          placeholder="Unlimited"
        />
        <p className="text-xs text-muted-foreground">Leave blank for unlimited challenges.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiresAt">Access expires</Label>
        <Input id="expiresAt" name="expiresAt" type="date" defaultValue={toDateInputValue(expiresAt)} required />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-primary">Saved.</p> : null}
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
