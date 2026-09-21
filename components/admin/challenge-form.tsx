"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createChallenge, type ChallengeActionState } from "@/app/admin/challenges/actions";
import { ACTIVITY_TYPES, METRIC_TYPES, METRIC_TYPE_LABELS } from "@/lib/validations";

const initialState: ChallengeActionState = {};

export function ChallengeForm() {
  const [state, formAction] = useActionState(createChallenge, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Challenge title</Label>
        <Input id="title" name="title" required placeholder="Autumn Inter-Departmental Challenge" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metricType">Leaderboard metric</Label>
        <select
          id="metricType"
          name="metricType"
          required
          defaultValue="total_distance_km"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {METRIC_TYPES.map((metric) => (
            <option key={metric} value={metric}>
              {METRIC_TYPE_LABELS[metric]}
            </option>
          ))}
        </select>
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
                defaultChecked
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {activity}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="targetDepartments">Target departments</Label>
        <Input id="targetDepartments" name="targetDepartments" placeholder="Engineering, Sales, HR" />
        <p className="text-xs text-muted-foreground">
          Comma-separated. Leave blank to open the challenge to the whole company.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <SubmitButton size="lg">Launch challenge</SubmitButton>
    </form>
  );
}
