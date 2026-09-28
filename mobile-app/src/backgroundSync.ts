import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { getStepsToday } from "./steps";
import { getSyncUrl } from "./syncPrefs";
import { postSteps } from "./stepsApi";
import { todayLocalDate } from "./dateFormat";

/**
 * Runs periodically in the background (registered from the main screen on
 * mount) to keep reporting steps without the app being open - the RN
 * equivalent of the native app's StepSyncWorker.kt + schedulePeriodicSync().
 *
 * Must be defined at module scope (not inside a component) so TaskManager
 * can find it again on a cold background launch - see this file's single
 * import from src/app/_layout.tsx, which is what guarantees this module
 * (and therefore this defineTask call) actually runs on every app start.
 */
export const BACKGROUND_SYNC_TASK = "pacevelo-step-sync";

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const syncUrl = await getSyncUrl();
  if (!syncUrl) return BackgroundTask.BackgroundTaskResult.Success;

  try {
    const stepsToday = await getStepsToday();
    const result = await postSteps(syncUrl, todayLocalDate(), stepsToday);
    return result.ok ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * 15 minutes is Android WorkManager's own minimum periodic interval (the
 * same floor the native app used). On iOS this is only ever a suggestion -
 * BGTaskScheduler decides the actual timing, sometimes hours apart - see
 * this repo's README for that platform limitation.
 */
export async function schedulePeriodicSync(): Promise<void> {
  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: 15 });
}
