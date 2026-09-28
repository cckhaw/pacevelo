import StepCounter from "../modules/step-counter/src/StepCounterModule";

/**
 * iOS implementation of the cross-platform steps interface (see
 * steps.android.ts for the other half and the module-level note there on
 * how the platform split works).
 *
 * UNTESTED - see modules/step-counter/ios/StepCounterModule.swift's own
 * header. CMPedometer already tracks steps-since-midnight and survives
 * reboots on its own, so unlike Android there's no banking logic needed
 * here at all - it's just a direct read.
 */
export function hasStepCounterSensor(): boolean {
  return StepCounter.hasStepCounterSensor();
}

export async function getStepsToday(): Promise<number> {
  return StepCounter.getTodayStepCount();
}
