/**
 * Type-only declaration for the platform-specific steps.android.ts /
 * steps.ios.ts pair - Metro resolves the real implementation file at
 * bundle time based on the running platform; this file exists purely so
 * `tsc` (which doesn't know about that convention) can type-check bare
 * imports of "./steps" / "@/steps".
 */
export function hasStepCounterSensor(): boolean;
export function getStepsToday(): Promise<number>;
