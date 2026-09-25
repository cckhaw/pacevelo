import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyTextButton } from "@/components/copy-text-button";
import { RegenerateDeviceTokenButton } from "@/components/regenerate-device-token-button";
import { AppNav } from "@/components/nav/app-nav";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDeviceSyncToken } from "@/lib/device-sync";
import { signOut } from "@/app/login/actions";

/**
 * Self-serve setup for reporting steps without Google Health (soft-deprecated,
 * see lib/feature-flags.ts): an iOS Shortcut or the sideloaded Android
 * companion app POSTs to the same URL shown here, authenticated by the
 * token baked into it - see app/api/devices/steps/route.ts.
 */
export default async function DevicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.userId),
    columns: { id: true, fullName: true },
  });
  if (!profile) redirect("/login");

  const token = await getOrCreateDeviceSyncToken(profile.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const syncUrl = `${appUrl}/api/devices/steps?token=${token}`;
  const qrSvg = await QRCode.toString(syncUrl, { type: "svg", margin: 1, width: 220 });

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="employee" fullName={profile.fullName} brandHref="/dashboard" signOutAction={signOut} />
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

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
            <CardTitle className="text-base">iPhone: set up an Apple Shortcut</CardTitle>
            <CardDescription>A few minutes, once. No app install required.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>
                Open the <strong>Shortcuts</strong> app → <strong>+</strong> to create a new shortcut.
              </li>
              <li>
                Add action <strong>Find Health Samples</strong> → set Sample Type to <strong>Steps</strong>, and set
                the date filter to <strong>Today</strong>.
              </li>
              <li>
                Add action <strong>Calculate Statistics</strong> → Statistic: <strong>Sum</strong>, input: the health
                samples from the step above. This gives you today&apos;s total step count.
              </li>
              <li>
                Add action <strong>Format Date</strong> → input: <strong>Current Date</strong>, Format:{" "}
                <strong>Custom</strong>, custom format <code className="rounded bg-muted px-1 py-0.5">yyyy-MM-dd</code>.
                This is your phone&apos;s own local date, which matters near midnight.
              </li>
              <li>
                Add action <strong>Get Contents of URL</strong>:
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                  <li>
                    URL: <code className="break-all rounded bg-muted px-1 py-0.5 text-xs">{syncUrl}</code>
                  </li>
                  <li>
                    Method: <strong>POST</strong>
                  </li>
                  <li>
                    Request Body: <strong>JSON</strong>, with two fields: <code className="rounded bg-muted px-1 py-0.5">steps</code>{" "}
                    set to the Sum from step 3, and <code className="rounded bg-muted px-1 py-0.5">date</code> set to
                    the formatted date from step 4.
                  </li>
                </ul>
              </li>
              <li>Name the shortcut something like &quot;Report Steps to PaceVelo&quot; and save it.</li>
              <li>
                Tap it once to test it - a successful run returns <code className="rounded bg-muted px-1 py-0.5">{'{"ok":true,...}'}</code>.
              </li>
              <li>
                To run it automatically: <strong>Automation</strong> tab → <strong>+</strong> →{" "}
                <strong>Create Personal Automation</strong> → <strong>Time of Day</strong> (e.g. 11:55 PM, repeat
                daily) → <strong>Run Shortcut</strong> → pick the one you just made.
              </li>
              <li>
                In that automation&apos;s settings, turn off <strong>Ask Before Running</strong> so it reports
                silently in the background.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Android: companion app</CardTitle>
            <CardDescription>Coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We&apos;re building a small Android app you&apos;ll be able to sideload and set up by scanning the QR
              code above. Check back soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
