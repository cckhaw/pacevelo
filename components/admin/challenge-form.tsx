"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import type { ChallengeActionState } from "@/app/admin/challenges/actions";
import { ACTIVITY_TYPES, METRIC_TYPES, METRIC_TYPE_LABELS, allowedMetricTypesFor } from "@/lib/validations";
import type { ActivityType, Challenge, MetricType } from "@/db/schema";

const initialState: ChallengeActionState = {};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ChallengeForm({
  action,
  challenge,
  defaultEmailDomain,
}: {
  action: (prevState: ChallengeActionState, formData: FormData) => Promise<ChallengeActionState>;
  challenge?: Challenge;
  defaultEmailDomain?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedActivities, setSelectedActivities] = useState<ActivityType[]>(
    challenge?.allowedActivities ?? [...ACTIVITY_TYPES],
  );
  const [metricTypePreference, setMetricTypePreference] = useState<MetricType>(
    challenge?.metricType ?? "total_distance_km",
  );
  const availableMetrics = allowedMetricTypesFor(selectedActivities);
  // Derived during render rather than synced via effect: whichever metric the
  // admin last picked, clamped to whatever the current activity selection
  // still allows, so an invalid combination can never be submitted.
  const metricType = availableMetrics.includes(metricTypePreference) ? metricTypePreference : availableMetrics[0];

  function toggleActivity(activity: ActivityType, checked: boolean) {
    setSelectedActivities((prev) => (checked ? [...prev, activity] : prev.filter((a) => a !== activity)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Challenge title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Autumn Inter-Departmental Challenge"
          defaultValue={challenge?.title}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={challenge ? toDateInputValue(challenge.startDate) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={challenge ? toDateInputValue(challenge.endDate) : undefined}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Allowed activities</legend>
        <div className="flex gap-4">
          {ACTIVITY_TYPES.map((activity) => (
            <label key={activity} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedActivities"
                value={activity}
                checked={selectedActivities.includes(activity)}
                onChange={(e) => toggleActivity(activity, e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {activity}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="metricType">Leaderboard metric</Label>
        <select
          id="metricType"
          name="metricType"
          required
          value={metricType}
          onChange={(e) => setMetricTypePreference(e.target.value as MetricType)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {METRIC_TYPES.filter((metric) => availableMetrics.includes(metric)).map((metric) => (
            <option key={metric} value={metric}>
              {METRIC_TYPE_LABELS[metric]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {availableMetrics.length === 1
            ? "Ride combined with Run and/or Walk can only be ranked by active time."
            : "Available metrics depend on which activities are allowed."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDepartments">Target departments</Label>
        <Input
          id="targetDepartments"
          name="targetDepartments"
          placeholder="Engineering, Sales, HR"
          defaultValue={challenge?.targetDepartments?.join(", ")}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. Leave blank to open the challenge to the whole company.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailDomain">Company email domain</Label>
        <Input
          id="emailDomain"
          name="emailDomain"
          placeholder="acme.com"
          defaultValue={challenge?.emailDomain ?? defaultEmailDomain ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Only @this-domain email addresses can join via this challenge&apos;s invite link. Leave blank to allow any
          email.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      {state.warning ? (
        <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-200">{state.warning}</p>
          <input type="hidden" name="confirmOverlap" value="true" />
          <SubmitButton variant="outline" className="w-full">
            {challenge ? "Save anyway" : "Create anyway"}
          </SubmitButton>
        </div>
      ) : (
        <SubmitButton size="lg">{challenge ? "Save changes" : "Launch challenge"}</SubmitButton>
      )}
    </form>
  );
}
