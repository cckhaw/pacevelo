import AsyncStorage from "@react-native-async-storage/async-storage";
import StepCounter from "../modules/step-counter/src/StepCounterModule";
import { applyStepBanking, type DailyStepState } from "./stepBanking";
import { todayLocalDate } from "./dateFormat";

/**
 * Android-only shell around the pure applyStepBanking algorithm - ported
 * from the native app's DailyStepTracker.kt (SharedPreferences ->
 * AsyncStorage, Settings.Global.BOOT_COUNT -> StepCounter.getBootCount()).
 * See stepBanking.ts for why this exists at all: TYPE_STEP_COUNTER resets
 * on reboot, so naive "today - baseline" arithmetic silently discards every
 * step taken before a reboot unless a reboot is specifically detected and
 * banked, which is exactly what this + stepBanking.ts do together.
 */
const STATE_KEY = "pacevelo.dailyStepState";

async function loadState(): Promise<DailyStepState | null> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyStepState;
  } catch {
    return null;
  }
}

async function saveState(state: DailyStepState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/**
 * Takes one new raw sensor reading and returns the resulting "steps
 * today" - persisting whatever state is needed to get the next call right
 * too, whether that's a moment later or after a reboot.
 */
export async function recordReading(): Promise<number> {
  const [previous, bootCount, rawStepsSinceBoot] = await Promise.all([
    loadState(),
    Promise.resolve(StepCounter.getBootCount()),
    StepCounter.getRawStepsSinceBoot(),
  ]);

  const outcome = applyStepBanking(previous, todayLocalDate(), bootCount, rawStepsSinceBoot);
  await saveState(outcome.newState);
  return outcome.stepsToday;
}
