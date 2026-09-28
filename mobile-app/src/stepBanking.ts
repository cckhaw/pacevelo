/**
 * Ported verbatim (same fields, same branches, same comments) from the
 * native Android app's StepBanking.kt - see that file's own header for the
 * full rationale. Kept as a pure function with no React Native or Expo
 * imports so it can be unit-tested with plain Jest, the same way the
 * original was unit-tested with plain JUnit (no device/emulator needed).
 */

/** Everything DailyStepTracker needs to persist between readings, in one immutable value. */
export interface DailyStepState {
  date: string;
  bankedSteps: number;
  sessionBaseline: number;
  lastRawInSession: number;
  sessionBootCount: number;
}

export interface StepBankingOutcome {
  newState: DailyStepState;
  stepsToday: number;
}

export function applyStepBanking(
  previous: DailyStepState | null,
  today: string,
  bootCount: number,
  rawStepsSinceBoot: number,
): StepBankingOutcome {
  if (previous === null || previous.date !== today) {
    // New day (or first run ever): today starts at 0, tracked from this
    // exact reading in whichever boot session we're in right now. Checked
    // before the boot-count comparison below, so a reboot that happens to
    // coincide with a day change is still handled correctly - there's
    // nothing from "yesterday" worth preserving either way.
    const state: DailyStepState = {
      date: today,
      bankedSteps: 0,
      sessionBaseline: rawStepsSinceBoot,
      lastRawInSession: rawStepsSinceBoot,
      sessionBootCount: bootCount,
    };
    return { newState: state, stepsToday: 0 };
  }

  if (bootCount !== previous.sessionBootCount) {
    // A reboot happened since our last reading. The sensor's old session
    // is gone and unreadable now, so the last value we actually recorded
    // from it is the only record of how many steps it saw - bank that
    // permanently, then start a fresh session baseline from this
    // post-reboot reading.
    const sessionSteps = Math.max(previous.lastRawInSession - previous.sessionBaseline, 0);
    const banked = previous.bankedSteps + sessionSteps;
    const state: DailyStepState = {
      date: today,
      bankedSteps: banked,
      sessionBaseline: rawStepsSinceBoot,
      lastRawInSession: rawStepsSinceBoot,
      sessionBootCount: bootCount,
    };
    return { newState: state, stepsToday: banked };
  }

  // Same day, same boot session: extend it. Math.max guards against a
  // spurious out-of-order reading rather than trusting the sensor to
  // always deliver strictly increasing values within one session.
  const newLastRaw = Math.max(previous.lastRawInSession, rawStepsSinceBoot);
  const state: DailyStepState = { ...previous, lastRawInSession: newLastRaw };
  const stepsToday = previous.bankedSteps + Math.max(newLastRaw - previous.sessionBaseline, 0);
  return { newState: state, stepsToday };
}
