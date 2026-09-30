import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";
import { dataRetentionDays } from "@/lib/strava/config";

/**
 * Shown next to every "connect Strava" step. Strava's API Policy (2.1, 7.2)
 * requires telling people, before we access their data: what we collect, how,
 * how to withdraw consent, and how to request deletion.
 */
export function StravaConsentNotice({ className }: { className?: string }) {
  return (
    <div className={`space-y-1.5 rounded-md border bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground ${className ?? ""}`}>
      <p className="font-medium text-foreground">What connecting Strava shares with PaceVelo</p>
      <p>
        With your permission on Strava, PaceVelo receives your Strava athlete ID and name, and - through
        Strava&apos;s authorization and automatic updates - the type, distance, moving time, elevation gain and date of
        each new activity that counts toward a challenge you&apos;ve joined. Activities you&apos;ve set to
        &quot;Only You&quot; on Strava are not used. Your name, department and challenge totals appear on your
        company&apos;s leaderboard.
      </p>
      <p>
        You can withdraw at any time by disconnecting Strava on your PaceVelo dashboard, or by removing PaceVelo in
        Strava&apos;s settings - either way, syncing stops. Activities already synced are kept for {dataRetentionDays()}{" "}
        days after the challenge they count toward ends, then deleted. To request earlier deletion of your data or get
        help, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        and we&apos;ll confirm by email once it&apos;s done. See our{" "}
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
