"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { saveCompany, type CompanyActionState } from "@/app/admin/company/actions";
import type { Company } from "@/db/schema";

const initialState: CompanyActionState = {};

export function CompanyForm({
  company,
  defaultOnboardingCode,
}: {
  company: Company | null;
  defaultOnboardingCode?: string;
}) {
  const [state, formAction] = useActionState(saveCompany, initialState);

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      {!company ? (
        <div className="space-y-2">
          <Label htmlFor="onboardingCode">Onboarding code</Label>
          <Input
            id="onboardingCode"
            name="onboardingCode"
            required
            placeholder="e.g. AB12CD34EF"
            className="uppercase"
            autoCapitalize="characters"
            defaultValue={defaultOnboardingCode ?? ""}
          />
          <p className="text-xs text-muted-foreground">The code PaceVelo gave you when you signed up.</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={company?.name ?? ""} required placeholder="Acme Corp" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Company logo</Label>
        {company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, not a static asset
          <img src={company.logoUrl} alt="Current logo" className="mb-2 h-12 w-12 rounded-lg object-contain" />
        ) : null}
        <Input id="logo" name="logo" type="file" accept="image/*" />
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 2MB.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slackWebhookUrl">Slack webhook URL</Label>
        <Input
          id="slackWebhookUrl"
          name="slackWebhookUrl"
          defaultValue={company?.slackWebhookUrl ?? ""}
          placeholder="https://hooks.slack.com/services/…"
        />
        <p className="text-xs text-muted-foreground">
          Used to post automated leaderboard updates to your team&apos;s Slack channel.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-primary">
          Saved!{" "}
          {!company ? (
            <Link href="/admin" className="font-medium underline-offset-4 hover:underline">
              Continue to your dashboard →
            </Link>
          ) : null}
        </p>
      ) : null}

      <SubmitButton size="lg">{company ? "Save changes" : "Create company"}</SubmitButton>
    </form>
  );
}
