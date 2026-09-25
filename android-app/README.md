# PaceVelo Steps (Android companion app)

A minimal sideload-only Android app that reports daily step counts to
PaceVelo, for challenges/participants who aren't using Strava. It exists
because Google Health's own cloud API requires a CASA security assessment
PaceVelo isn't pursuing right now (see `lib/feature-flags.ts` in the main
repo) - this app talks to the same device-sync endpoint
(`POST /api/devices/steps`) the iPhone setup uses, just via a native app
instead of an Apple Shortcut, since Android's Health Connect (like
HealthKit) has no cloud API either - something has to run on-device.

## How it works

1. Reads today's step count from the device's built-in step-counter
   hardware sensor (`Sensor.TYPE_STEP_COUNTER`) - no Health Connect
   dependency, no Google Play Services requirement.
2. On first launch, scan the QR code from your PaceVelo dashboard
   (`/dashboard/devices`) to configure which account to report to - the QR
   encodes your personal setup URL, already carrying your bearer token.
3. Reports the current day's step count immediately when you tap "Sync
   now," and automatically in the background roughly every 15 minutes via
   WorkManager (Android's minimum periodic interval).

This is a debug build meant for **sideloading during a pilot**, not a Play
Store release: no release signing config, minification off. Anyone
installing it needs "Install unknown apps" enabled for whatever app they
use to open the `.apk` (browser, file manager, etc.).

## Building it yourself

Requires a JDK (17+) and the Android SDK (command-line tools, platform 34,
build-tools 34.0.0) - if `ANDROID_HOME`/`local.properties` isn't already
pointing at one, install via `sdkmanager` first.

```bash
cd android-app
./gradlew assembleDebug
# output: app/build/outputs/apk/debug/app-debug.apk
```

## What's deliberately left out (for a fast, low-risk first build)

- No release signing / Play Store listing - sideload only.
- No Health Connect integration - the raw step-counter sensor is simpler,
  has zero extra dependencies, and doesn't require declaring Health
  Connect permissions. Worth reconsidering if the pilot goes well and more
  precise day-boundary handling across reboots matters.
- Token/URL are stored in plain `SharedPreferences`, matching the trust
  model of the URL itself (treat it like a password, per the dashboard's
  own warning) - fine for a pilot, worth hardening (Android Keystore-backed
  encrypted prefs) before a wider rollout.
- No UI polish beyond a single functional screen.
