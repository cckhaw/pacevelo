/**
 * Download link for the sideloaded Android companion app (see
 * android-app/README.md) - a debug-signed .apk for a pilot, not a Play
 * Store release, so it's just a static download rather than anything
 * store-distributed. Build it (`./gradlew assembleDebug`), upload
 * app/build/outputs/apk/debug/app-debug.apk somewhere reachable (e.g.
 * Vercel Blob, same as company logo uploads) and paste its URL here.
 * Leave unset and the dashboard shows a "coming soon" placeholder instead.
 */
export function androidApkDownloadUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
  return url && url.trim() ? url : null;
}
