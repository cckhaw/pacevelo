import { applyStepBanking, type DailyStepState } from "./stepBanking";

/**
 * Ported 1:1 from the native app's StepBankingTest.kt - same scenarios,
 * same numbers, same assertions - to prove the TypeScript port preserves
 * the exact reboot-banking behavior "bulletproof across reboots" requires.
 */
describe("applyStepBanking", () => {
  const today = "2026-09-25";
  const yesterday = "2026-09-24";

  test("first ever reading starts today at zero", () => {
    const outcome = applyStepBanking(null, today, 5, 1234);

    expect(outcome.stepsToday).toBe(0);
    expect(outcome.newState.date).toBe(today);
    expect(outcome.newState.sessionBaseline).toBe(1234);
    expect(outcome.newState.lastRawInSession).toBe(1234);
    expect(outcome.newState.sessionBootCount).toBe(5);
    expect(outcome.newState.bankedSteps).toBe(0);
  });

  test("same boot session accumulates normally", () => {
    const afterFirst = applyStepBanking(null, today, 5, 1000);
    const afterSecond = applyStepBanking(afterFirst.newState, today, 5, 1500);

    expect(afterSecond.stepsToday).toBe(500);
  });

  test("a reboot mid-day banks the prior session instead of losing it", () => {
    // First reading of the day establishes the session baseline (0 steps
    // recorded yet), then 3,000 steps are walked before a reboot wipes the
    // sensor's own counter.
    const baseline = applyStepBanking(null, today, 1, 10_000);
    const beforeReboot = applyStepBanking(baseline.newState, today, 1, 13_000);
    // Device reboots; the next reading comes from a new boot session whose
    // raw counter has reset near zero, as TYPE_STEP_COUNTER does.
    const afterReboot = applyStepBanking(beforeReboot.newState, today, 2, 12);

    // The pre-reboot steps must survive, not reset to 0.
    expect(afterReboot.stepsToday).toBe(3000);
    expect(afterReboot.newState.sessionBootCount).toBe(2);
    expect(afterReboot.newState.sessionBaseline).toBe(12);
  });

  test("steps keep accumulating correctly after the reboot too", () => {
    const baseline = applyStepBanking(null, today, 1, 10_000);
    const beforeReboot = applyStepBanking(baseline.newState, today, 1, 13_000);
    const justAfterReboot = applyStepBanking(beforeReboot.newState, today, 2, 12);
    const laterAfterReboot = applyStepBanking(justAfterReboot.newState, today, 2, 512);

    // 3,000 banked from before the reboot + 500 walked since it.
    expect(laterAfterReboot.stepsToday).toBe(3500);
  });

  test("multiple reboots in the same day all get banked", () => {
    let state = applyStepBanking(null, today, 1, 1000).newState;
    state = applyStepBanking(state, today, 1, 2000).newState; // +1000
    state = applyStepBanking(state, today, 2, 50).newState; // reboot, banks 1000
    state = applyStepBanking(state, today, 2, 800).newState; // +750
    const final = applyStepBanking(state, today, 3, 5); // reboot, banks 750 more

    expect(final.stepsToday).toBe(1000 + 750);
  });

  test("a new calendar day resets to zero even in the same boot session", () => {
    const yesterdayEnd = applyStepBanking(null, yesterday, 1, 8000);
    const todayStart = applyStepBanking(yesterdayEnd.newState, today, 1, 8010);

    expect(todayStart.stepsToday).toBe(0);
    expect(todayStart.newState.sessionBaseline).toBe(8010);
  });

  test("a reboot exactly at the day boundary is still handled correctly", () => {
    const yesterdayEnd = applyStepBanking(null, yesterday, 1, 8000);
    // Both the day changed AND the device rebooted before the next reading.
    const todayStart = applyStepBanking(yesterdayEnd.newState, today, 2, 3);

    // The day-change branch wins: today starts at 0, not at whatever
    // yesterday's banking arithmetic would have produced.
    expect(todayStart.stepsToday).toBe(0);
    expect(todayStart.newState.sessionBootCount).toBe(2);
  });

  test("an out-of-order lower reading within a session never decreases the total", () => {
    const first = applyStepBanking(null, today, 1, 500);
    const higher = applyStepBanking(first.newState, today, 1, 700);
    // A spurious/duplicate delivery reporting a lower value than one we've already seen this session.
    const spurious = applyStepBanking(higher.newState, today, 1, 650);

    expect(spurious.stepsToday).toBe(200);
  });

  test("steps today is never negative", () => {
    // Pathological: a reading arrives below the stored session baseline
    // without a boot-count change (shouldn't normally happen, but must not
    // surface as negative steps if it does).
    const state: DailyStepState = { date: today, bankedSteps: 0, sessionBaseline: 500, lastRawInSession: 500, sessionBootCount: 1 };
    const outcome = applyStepBanking(state, today, 1, 100);

    expect(outcome.stepsToday).toBe(0);
  });
});
