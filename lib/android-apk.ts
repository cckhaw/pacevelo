/**
 * Download link for the sideloaded Android companion app (see
 * android-app/README.md) - a debug-signed .apk for a pilot, not a Play
 * Store release, so it's just a static download rather than anything
 * store-distributed. The built .apk itself is committed at
 * public/downloads/pacevelo-steps.apk (see that folder's note on updating
 * it), so Vercel serves it as a static asset of this same deployment - set
 * this to `${your domain}/downloads/pacevelo-steps.apk`. Leave unset and
 * the dashboard shows a "coming soon" placeholder instead.
 */
export function androidApkDownloadUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
  return url && url.trim() ? url : null;
}
