import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Clock, Download, Info, Link2, Smartphone, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyTextButton } from "@/components/copy-text-button";
import { RegenerateDeviceTokenButton } from "@/components/regenerate-device-token-button";
import { AppNav } from "@/components/nav/app-nav";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getLatestStepSync, getOrCreateDeviceSyncToken } from "@/lib/device-sync";
import {
  IOS_SHORTCUT_NAME,
  iosShortcutAutomationInstallUrl,
  iosShortcutInstallUrl,
  iosShortcutPersonalizeUrl,
} from "@/lib/ios-shortcut";
import { androidApkDownloadUrl } from "@/lib/android-apk";
import { formatRelativeTime } from "@/lib/time";
import { signOut } from "@/app/login/actions";

function formatSyncDay(day: Date) {
  // The stored day is midnight-UTC-anchored (see lib/device-sync.ts), so
  // read it back in UTC too, rather than the viewer's own timezone shifting
  // it to the wrong calendar day.
  return day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Self-serve setup for reporting steps without Google Health (soft-deprecated,
 * see lib/feature-flags.ts): an iOS Shortcut or the sideloaded Android
 * companion app POSTs to the same URL shown here, authenticated by the
 * token baked into it - see app/api/devices/steps/route.ts.
 */
export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { id: true, fullName: true },
  });
  if (!profile) redirect("/login");

  const token = await getOrCreateDeviceSyncToken(profile.id);
  const latestSync = await getLatestStepSync(profile.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const syncUrl = `${appUrl}/api/devices/steps?token=${token}`;
  const qrSvg = await QRCode.toString(syncUrl, { type: "svg", margin: 1, width: 220 });

  const shortcutInstallUrl = iosShortcutInstallUrl();
  const shortcutPersonalizeUrl = iosShortcutPersonalizeUrl(syncUrl);
  const shortcutAutomationInstallUrl = iosShortcutAutomationInstallUrl();

  const apkUrl = androidApkDownloadUrl();
  const apkQrSvg = apkUrl ? await QRCode.toString(apkUrl, { type: "svg", margin: 1, width: 220 }) : null;

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="employee" fullName={profile.fullName} brandHref="/dashboard" signOutAction={signOut} />
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {welcome ? (
          <p className="mb-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            You&apos;re in! Set up phone sync below to start reporting steps.
          </p>
        ) : null}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" /> Report steps from your phone
            </CardTitle>
            <CardDescription>
              For a step-based challenge without Google Health. Set this up once on your phone and it keeps
              reporting automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Last steps received</span>
              {latestSync ? (
                <Badge className="gap-1 bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  {formatSyncDay(latestSync.day)} · {latestSync.steps.toLocaleString()} steps ·{" "}
                  {formatRelativeTime(latestSync.updatedAt)}
                </Badge>
              ) : (
                <Badge variant="outline">Nothing yet</Badge>
              )}
            </div>

            <div className="flex justify-center rounded-md border bg-card p-4">
              {/* Server-generated QR of the sync URL below - scan it with the
                  Android companion app once it's installed. */}
              <div className="[&_svg]:h-[180px] [&_svg]:w-[180px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Your personal setup URL</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-1.5 text-xs">{syncUrl}</code>
                <CopyTextButton text={syncUrl} />
              </div>
              <p className="text-xs text-muted-foreground">
                This link is personal to you - anyone with it could report steps under your name, so treat it like a
                password and don&apos;t share it.
              </p>
            </div>

            <RegenerateDeviceTokenButton />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">iPhone: install the PaceVelo Shortcut</CardTitle>
            <CardDescription>
              {shortcutInstallUrl
                ? shortcutAutomationInstallUrl
                  ? "Three taps, then it syncs automatically whenever you open WhatsApp."
                  : "Two taps, then it reports automatically."
                : "A few minutes, once. No app install required."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>
                Do this <strong>on your iPhone</strong>, in Safari - not on a laptop or desktop. These links open the
                Shortcuts app, which only exists on iOS, so tapping them anywhere else won&apos;t work.
              </span>
            </div>
            {shortcutInstallUrl ? (
              <div className="space-y-4">
                <ol className="list-decimal space-y-3 pl-5 text-sm">
                  <li>
                    <Button asChild size="sm">
                      <a href={shortcutInstallUrl}>
                        <Download className="h-3.5 w-3.5" /> Install the Shortcut
                      </a>
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Opens the Shortcuts app - tap <strong>Add Shortcut</strong> there. Only needed the first time
                      you set up any phone.
                    </p>
                  </li>
                  <li>
                    <Button asChild size="sm" variant="outline">
                      <a href={shortcutPersonalizeUrl}>
                        <Link2 className="h-3.5 w-3.5" /> Connect it to your account
                      </a>
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Links the shortcut to you and syncs today&apos;s steps right away. Do this on every phone
                      you&apos;ve installed the shortcut on, and again any time you get a new setup link.
                    </p>
                  </li>
                  {shortcutAutomationInstallUrl ? (
                    <li>
                      <Button asChild size="sm" variant="outline">
                        <a href={shortcutAutomationInstallUrl}>
                          <Clock className="h-3.5 w-3.5" /> Turn on automatic sync
                        </a>
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Opens the Shortcuts app - tap <strong>Add Automation</strong>, then tap the{" "}
                        <strong>&quot;Automation is turned off&quot;</strong> banner at the top to switch it on.
                        Apple always adds a shared automation switched off as a safety default, so this one extra tap
                        is unavoidable - but only needed once per phone. Once it&apos;s on, it silently runs the
                        shortcut every time you open WhatsApp or WhatsApp Business, so your steps update whenever
                        you use your phone - no need to open the Shortcuts app.
                      </p>
                    </li>
                  ) : null}
                </ol>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    Prefer to build it yourself, or the buttons above didn&apos;t work?
                  </summary>
                  <div className="mt-3">
                    <ShortcutManualSteps syncUrl={syncUrl} personalizeUrl={shortcutPersonalizeUrl} />
                  </div>
                </details>
              </div>
            ) : (
              <ShortcutManualSteps syncUrl={syncUrl} personalizeUrl={shortcutPersonalizeUrl} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Android: companion app</CardTitle>
            <CardDescription>
              {apkUrl ? "A small app you sideload once - then it reports automatically." : "Coming soon."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apkUrl ? (
              <div className="space-y-4">
                <ol className="list-decimal space-y-3 pl-5 text-sm">
                  <li>
                    <Button asChild size="sm">
                      <a href={apkUrl}>
                        <Download className="h-3.5 w-3.5" /> Download the app (.apk)
                      </a>
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      On your phone, tap this to download directly - or scan the QR code below with your phone&apos;s
                      camera if you&apos;re reading this page on a computer.
                    </p>
                    <div className="mt-2 flex justify-center rounded-md border bg-card p-4">
                      <div
                        className="[&_svg]:h-[140px] [&_svg]:w-[140px]"
                        dangerouslySetInnerHTML={{ __html: apkQrSvg! }}
                      />
                    </div>
                  </li>
                  <li>
                    <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                      <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>
                        Since this isn&apos;t from the Play Store, Android blocks the install by default. When you
                        open the downloaded file, tap <strong>Settings</strong> on the warning that appears, then
                        turn on <strong>Allow from this source</strong> for the app you downloaded it with (Chrome,
                        Files, etc.) and go back to install it. Exact wording varies by phone - if you don&apos;t see
                        that prompt, it&apos;s usually under <strong>Settings → Apps → Special access → Install
                        unknown apps</strong>.
                      </span>
                    </div>
                  </li>
                  <li>
                    Open the installed <strong>PaceVelo Steps</strong> app and tap <strong>Scan setup QR code</strong>
                    , then scan the &quot;Report steps from your phone&quot; QR code above. It&apos;ll sync
                    immediately and then keep reporting automatically in the background.
                  </li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We&apos;re building a small Android app you&apos;ll be able to sideload and set up by scanning the QR
                code above. Check back soon.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Builds the *reusable* shortcut: it reads its setup URL from whatever it's
 * given as input and saves that to a file, rather than having one person's
 * URL hardcoded in - so the same shortcut works for every employee. Shown
 * either as the fallback when no iCloud install link is configured yet, or
 * tucked under "build it yourself" once one is - see lib/ios-shortcut.ts.
 * Whoever builds this (following these exact steps) and shares it via the
 * Shortcuts app's Share Sheet -> Copy iCloud Link produces the link that
 * goes into NEXT_PUBLIC_IOS_SHORTCUT_ICLOUD_URL, unlocking the two-tap flow
 * above for everyone else.
 */
function ShortcutManualSteps({ syncUrl, personalizeUrl }: { syncUrl: string; personalizeUrl: string }) {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm">
      <li>
        Open the <strong>Shortcuts</strong> app → <strong>+</strong> to create a new shortcut.
      </li>
      <li>
        Add action <strong>If</strong> → input: <strong>Shortcut Input</strong>, condition{" "}
        <strong>has any value</strong>.
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            Inside the <strong>If</strong>, add action <strong>Save File</strong> → input:{" "}
            <strong>Shortcut Input</strong>, Service: <strong>iCloud Drive</strong>, path{" "}
            <code className="rounded bg-muted px-1 py-0.5">Shortcuts/pacevelo-setup.txt</code>, Overwrite:{" "}
            <strong>Yes</strong>.
          </li>
        </ul>
        This is what lets a link running the shortcut with your setup URL as input (like the one in step 11 below)
        personalize it without you editing it.
      </li>
      <li>
        Add action <strong>Get File</strong> → File: <code className="rounded bg-muted px-1 py-0.5">Shortcuts/pacevelo-setup.txt</code>
        , Service: <strong>iCloud Drive</strong>. Then add <strong>Get Text from Input</strong> on that file - this
        is your saved setup URL.
      </li>
      <li>
        Add action <strong>If</strong> → input: the text from the step above, condition{" "}
        <strong>has no value</strong>.
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            Inside it, add <strong>Show Alert</strong> (&quot;Not set up - open your PaceVelo dashboard and tap the
            setup link again.&quot;), then <strong>Stop This Shortcut</strong>.
          </li>
        </ul>
      </li>
      <li>
        Add action <strong>Find Health Samples</strong> → set Sample Type to <strong>Steps</strong>, and set the
        date filter to <strong>Today</strong>.
      </li>
      <li>
        Add action <strong>Calculate Statistics</strong> → Statistic: <strong>Sum</strong>, input: the health
        samples from the step above. This gives you today&apos;s total step count.
      </li>
      <li>
        Add action <strong>Format Date</strong> → input: <strong>Current Date</strong>, Format:{" "}
        <strong>Custom</strong>, custom format <code className="rounded bg-muted px-1 py-0.5">yyyy-MM-dd</code>. This
        is your phone&apos;s own local date, which matters near midnight.
      </li>
      <li>
        Add action <strong>Get Contents of URL</strong>:
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>
            URL: the saved setup URL from step 3 (not typed in directly - that&apos;s what makes this version
            reusable).
          </li>
          <li>
            Method: <strong>POST</strong>
          </li>
          <li>
            Request Body: <strong>JSON</strong>, with two fields: <code className="rounded bg-muted px-1 py-0.5">steps</code>{" "}
            set to the Sum from step 6, and <code className="rounded bg-muted px-1 py-0.5">date</code> set to the
            formatted date from step 7.
          </li>
        </ul>
      </li>
      <li>
        Add action <strong>Show Notification</strong> → Title <strong>PaceVelo</strong>, Body: text combining
        &quot;Synced &quot;, the Sum from step 6, and &quot; steps&quot;. Unlike Show Alert, a notification doesn&apos;t
        need to be dismissed, so it won&apos;t interrupt a silent background run - it&apos;s what lets you glance at
        your phone and confirm the automation actually ran, instead of trusting it on faith. The dashboard&apos;s
        &quot;Last steps received&quot; status (above) is the other way to check, from any device.
      </li>
      <li>
        Name the shortcut exactly <strong>{IOS_SHORTCUT_NAME}</strong> and save it - the exact name matters, it&apos;s
        what the personalize link in the next step (and, once this shortcut is shared back to PaceVelo as the
        install link, the &quot;Connect it to your account&quot; button) look for.
      </li>
      <li>
        Tap it once to test it. On this first run, <strong>Shortcut Input</strong> is empty (nothing&apos;s been
        connected yet) so it should show the &quot;Not set up&quot; alert - that&apos;s expected. To actually test
        end-to-end, open this link once (it runs the shortcut with your setup URL as input, exactly like the
        &quot;Connect it to your account&quot; button does):
        <div className="mt-1.5">
          <code className="block break-all rounded-md border bg-muted px-2 py-1.5 text-xs">{personalizeUrl}</code>
        </div>
        A successful run POSTs to your setup URL and returns <code className="rounded bg-muted px-1 py-0.5">{'{"ok":true,...}'}</code>{" "}
        (setup URL: <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">{syncUrl}</code>).
      </li>
      <li>
        To run it automatically: <strong>Automation</strong> tab → <strong>+</strong> →{" "}
        <strong>Create Personal Automation</strong> → <strong>App</strong> → choose <strong>WhatsApp</strong> (and{" "}
        <strong>WhatsApp Business</strong>, if you use it) with <strong>Is Opened</strong> →{" "}
        <strong>Run Shortcut</strong> → pick the one you just made.
      </li>
      <li>
        In that automation&apos;s settings, turn off <strong>Ask Before Running</strong> so it reports silently in
        the background. (An app-opened automation runs while the phone is unlocked, unlike a time-based one, which
        iOS skips when the phone is locked.)
      </li>
    </ol>
  );
}
