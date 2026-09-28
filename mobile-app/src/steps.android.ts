import StepCounter from "../modules/step-counter/src/StepCounterModule";
import { recordReading } from "./dailyStepTracker";

/**
 * Android implementation of the cross-platform steps interface (see
 * steps.ios.ts for the other half) - Metro picks whichever of these two
 * files matches the running platform automatically, so the rest of the
 * app just imports "./steps" and never branches on Platform.OS itself.
 *
 * Android has no OS-level "steps today" aggregate the way iOS's
 * CMPedometer does, so this reads the raw step-counter sensor and runs it
 * through the reboot-safe banking algorithm (see stepBanking.ts) instead.
 */
export function hasStepCounterSensor(): boolean {
  return StepCounter.hasStepCounterSensor();
}

export async function getStepsToday(): Promise<number> {
  return recordReading();
}
