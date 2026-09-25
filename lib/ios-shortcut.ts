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
