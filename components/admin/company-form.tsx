"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { saveCompany, type CompanyActionState } from "@/app/admin/company/actions";
import type { Database } from "@/types/database";

const initialState: CompanyActionState = {};

export function CompanyForm({ company }: { company: Database["public"]["Tables"]["companies"]["Row"] | null }) {
  const [state, formAction] = useActionState(saveCompany, initialState);

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={company?.name ?? ""} required placeholder="Acme Corp" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Company logo</Label>
        {company?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, not a static asset
          <img src={company.logo_url} alt="Current logo" className="mb-2 h-12 w-12 rounded-lg object-contain" />
        ) : null}
        <Input id="logo" name="logo" type="file" accept="image/*" />
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 2MB.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slackWebhookUrl">Slack webhook URL</Label>
        <Input
          id="slackWebhookUrl"
          name="slackWebhookUrl"
          defaultValue={company?.slack_webhook_url ?? ""}
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
