/**
 * The reusable Apple Shortcut every iPhone participant installs is the same
 * one, shared via a single iCloud link (see README.md's "iOS Shortcut" note
 * for how that link gets created) - it has nobody's token baked in. Instead
 * it reads its setup URL from the shortcut's own input, so each employee's
 * dashboard just needs to hand it their personal URL at first run via the
 * `shortcuts://run-shortcut` deep link below; the shortcut itself persists
 * whatever it's given for every later (silent, automated) run.
 *
 * NEXT_PUBLIC_IOS_SHORTCUT_ICLOUD_URL is unset until someone actually builds
 * that shortcut on a real iPhone and shares it - Apple only signs a
 * Shortcut (so recipients don't hit its "Untrusted Shortcut" warning) when
 * it's shared this way; there's no way to produce that signed file
 * programmatically. Until it's set, the dashboard falls back to instructions
 * for building it by hand.
 */
export const IOS_SHORTCUT_NAME = "Report Steps to PaceVelo";

export function iosShortcutInstallUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IOS_SHORTCUT_ICLOUD_URL;
  return url && url.trim() ? url : null;
}

/**
 * iCloud link for the pre-built Personal Automation (App: WhatsApp / WhatsApp
 * Business Is Opened -> Run Shortcut "Report Steps to PaceVelo" -> Ask Before Running off) - like
 * the shortcut itself, an Automation can be shared via iCloud link (long-
 * press it in the Automation tab -> Share -> Copy iCloud Link), and opening
 * that link offers to add the whole automation as configured. This lets step
 * 3 below skip the manual "Automation tab -> + -> Create Personal
 * Automation -> ..." setup (still covered in ShortcutManualSteps as a
 * fallback for anyone without this link). Optional - unset until someone
 * builds and shares that automation, same as NEXT_PUBLIC_IOS_SHORTCUT_ICLOUD_URL.
 *
 * One thing this link can't do anything about: Apple always imports a
 * shared automation switched OFF, no matter how the original was
 * configured - there's no parameter here to override it, so the dashboard's
 * instructions tell people to flip that toggle themselves after adding it.
 */
export function iosShortcutAutomationInstallUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IOS_SHORTCUT_AUTOMATION_ICLOUD_URL;
  return url && url.trim() ? url : null;
}

/**
 * Deep link that runs the (already-installed) shortcut once with `setupUrl`
 * as its input, which the shortcut saves for every future silent run.
 *
 * Built by hand rather than via URLSearchParams: that encodes spaces as `+`
 * (the application/x-www-form-urlencoded convention), but the Shortcuts app
 * doesn't decode `+` back to a space in its `name` param - it looks up the
 * shortcut by that literal string and fails with "The file doesn't exist."
 * Percent-encoding (%20) is what it actually expects.
 */
export function iosShortcutPersonalizeUrl(setupUrl: string): string {
  const name = encodeURIComponent(IOS_SHORTCUT_NAME);
  const input = encodeURIComponent("text");
  const text = encodeURIComponent(setupUrl);
  return `shortcuts://run-shortcut?name=${name}&input=${input}&text=${text}`;
}
