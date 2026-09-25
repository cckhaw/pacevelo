"use client";

import { useActionState, useState } from "react";
import { Plus, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import type { ChallengeActionState } from "@/app/admin/challenges/actions";
import {
  ACTIVITY_TYPES,
  CHALLENGE_DATA_SOURCE_LABELS,
  METRIC_TYPES,
  METRIC_TYPE_LABELS,
  allowedMetricTypesFor,
  isStepsDataSource,
} from "@/lib/validations";
import { GOOGLE_HEALTH_ENABLED } from "@/lib/feature-flags";
import type { ActivityType, Challenge, ChallengeDataSource, MetricType } from "@/db/schema";

const initialState: ChallengeActionState = {};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** "1st", "2nd", "3rd", "4th", ... - including the 11th-13th exception. */
function ordinal(n: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const remainder = n % 100;
  return `${n}${suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0]}`;
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
  // React's own post-action form reset (a React 19 <form action> behavior)
  // still reaches into the DOM and blanks radio/checkbox `checked` state
  // even though they're controlled here - text/date <Input>s are immune
  // because their `value` prop gets re-applied on every render regardless,
  // but React skips re-writing `checked` when the backing state value
  // itself hasn't changed, so a stray native reset the browser did outside
  // React's knowledge sticks. Bumping this key after every action
  // completion forces the radio/checkbox groups below to remount fresh
  // (state is a new object each time useActionState's action resolves, so
  // this fires exactly when needed) rather than patch in place, which
  // re-reads the real React state and wins. Adjusted during render (React's
  // documented pattern for "respond to a prop/value change") rather than
  // via an effect, which would apply the fix one render too late.
  const [prevState, setPrevState] = useState(state);
  const [formVersion, setFormVersion] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setFormVersion((v) => v + 1);
  }
  // Controlled, rather than defaultValue - a form action (like the overlap
  // warning below) resets uncontrolled fields back to their original
  // defaultValue once it completes, same as a native form reset, which
  // would otherwise blank out (or on an edit, silently revert) everything
  // the admin just typed the moment they click "Create/Save anyway".
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [startDate, setStartDate] = useState(challenge ? toDateInputValue(challenge.startDate) : "");
  const [endDate, setEndDate] = useState(challenge ? toDateInputValue(challenge.endDate) : "");
  const [targetDepartments, setTargetDepartments] = useState(challenge?.targetDepartments?.join(", ") ?? "");
  const [emailDomain, setEmailDomain] = useState(challenge?.emailDomain ?? defaultEmailDomain ?? "");
  const [dataSource, setDataSource] = useState<ChallengeDataSource>(challenge?.dataSource ?? "strava");
  const [selectedActivities, setSelectedActivities] = useState<ActivityType[]>(
    challenge?.allowedActivities ?? [...ACTIVITY_TYPES],
  );
  const [metricTypePreference, setMetricTypePreference] = useState<MetricType>(
    challenge?.metricType ?? "total_distance_km",
  );
  const [prizes, setPrizes] = useState<string[]>(challenge?.prizes ?? []);
  const availableMetrics: MetricType[] = isStepsDataSource(dataSource)
    ? ["total_steps"]
    : allowedMetricTypesFor(selectedActivities);
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* min-w-0 lets each column shrink below a date input's native
            intrinsic width, which otherwise pushes the grid wider than the
            screen on narrow phones. */}
        <div className="min-w-0 space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Data source</legend>
        {challenge ? (
          <>
            <input type="hidden" name="dataSource" value={dataSource} />
            <p className="text-sm">{CHALLENGE_DATA_SOURCE_LABELS[dataSource]}</p>
            <p className="text-xs text-muted-foreground">The data source can&apos;t be changed after a challenge is created.</p>
          </>
        ) : (
          <div key={`datasource-${formVersion}`} className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dataSource"
                value="strava"
                checked={dataSource === "strava"}
                onChange={() => setDataSource("strava")}
                className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              Strava
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dataSource"
                value="device_sync"
                checked={dataSource === "device_sync"}
                onChange={() => setDataSource("device_sync")}
                className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              Smartphone Sync (steps)
            </label>
            {GOOGLE_HEALTH_ENABLED ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="dataSource"
                  value="google_health"
                  checked={dataSource === "google_health"}
                  onChange={() => setDataSource("google_health")}
                  className="h-4 w-4 border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                Google Health
              </label>
            ) : null}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {dataSource === "strava"
            ? "Participants connect Strava, so every entry is backed by GPS-verified distance and time - not a step count anyone could fake."
            : dataSource === "device_sync"
              ? "Participants report daily steps from an iPhone Shortcut or the Android app, no separate account to connect."
              : "Participants connect Google Health and are ranked by daily step count."}
        </p>
      </fieldset>

      {dataSource === "strava" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Allowed activities</legend>
          <div key={`activities-${formVersion}`} className="flex gap-4">
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
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="metricType">Leaderboard metric</Label>
        {isStepsDataSource(dataSource) ? (
          <>
            <input type="hidden" name="metricType" value="total_steps" />
            <p className="text-sm">Total steps</p>
          </>
        ) : (
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
        )}
        <p className="text-xs text-muted-foreground">
          {isStepsDataSource(dataSource)
            ? "Steps-based challenges are always ranked by total steps."
            : availableMetrics.length === 1
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
          value={targetDepartments}
          onChange={(e) => setTargetDepartments(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. Leave blank to open the challenge to the whole company.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-sm font-medium">
          <Trophy className="h-4 w-4 text-primary" /> Prizes (optional)
        </legend>
        <p className="text-xs text-muted-foreground">
          Give the top finishers something to chase. Anyone in these individual leaderboard positions will see
          they&apos;re in the running on the public leaderboard.
        </p>
        {prizes.length > 0 ? (
          <div className="space-y-2">
            {prizes.map((prize, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-sm font-medium text-muted-foreground">{ordinal(i + 1)}</span>
                <Input
                  name="prizes"
                  required
                  maxLength={200}
                  placeholder={`e.g. RM100 grocery voucher`}
                  value={prize}
                  onChange={(e) =>
                    setPrizes((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPrizes((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${ordinal(i + 1)} place prize`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setPrizes((prev) => [...prev, ""])}>
          <Plus className="h-3.5 w-3.5" /> Add a prize for {ordinal(prizes.length + 1)} place
        </Button>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="emailDomain">Company email domain</Label>
        <Input
          id="emailDomain"
          name="emailDomain"
          placeholder="acme.com"
          value={emailDomain}
          onChange={(e) => setEmailDomain(e.target.value)}
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
