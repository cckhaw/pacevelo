package cc.khaw.pacevelo.stepreporter

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Exercises the reboot-banking arithmetic directly - no Context, no device,
 * no emulator needed, since StepBanking.apply is a pure function. These are
 * exactly the scenarios "bulletproof across reboots" has to hold for.
 */
class StepBankingTest {

    private val today = "2026-09-25"
    private val yesterday = "2026-09-24"

    @Test
    fun `first ever reading starts today at zero`() {
        val outcome = StepBanking.apply(previous = null, today = today, bootCount = 5, rawStepsSinceBoot = 1234)

        assertEquals(0, outcome.stepsToday)
        assertEquals(today, outcome.newState.date)
        assertEquals(1234, outcome.newState.sessionBaseline)
        assertEquals(1234, outcome.newState.lastRawInSession)
        assertEquals(5, outcome.newState.sessionBootCount)
        assertEquals(0, outcome.newState.bankedSteps)
    }

    @Test
    fun `same boot session accumulates normally`() {
        val afterFirst = StepBanking.apply(previous = null, today = today, bootCount = 5, rawStepsSinceBoot = 1000)
        val afterSecond = StepBanking.apply(afterFirst.newState, today, bootCount = 5, rawStepsSinceBoot = 1500)

        assertEquals(500, afterSecond.stepsToday)
    }

    @Test
    fun `a reboot mid-day banks the prior session instead of losing it`() {
        // First reading of the day establishes the session baseline (0
        // steps recorded yet), then 3,000 steps are walked before a reboot
        // wipes the sensor's own counter.
        val baseline = StepBanking.apply(previous = null, today = today, bootCount = 1, rawStepsSinceBoot = 10_000)
        val beforeReboot = StepBanking.apply(baseline.newState, today, bootCount = 1, rawStepsSinceBoot = 13_000)
        // Device reboots; the next reading comes from a new boot session
        // whose raw counter has reset near zero, as TYPE_STEP_COUNTER does.
        val afterReboot = StepBanking.apply(beforeReboot.newState, today, bootCount = 2, rawStepsSinceBoot = 12)

        // The pre-reboot steps must survive, not reset to 0.
        assertEquals(3000, afterReboot.stepsToday)
        assertEquals(2, afterReboot.newState.sessionBootCount)
        assertEquals(12, afterReboot.newState.sessionBaseline)
    }

    @Test
    fun `steps keep accumulating correctly after the reboot too`() {
        val baseline = StepBanking.apply(previous = null, today = today, bootCount = 1, rawStepsSinceBoot = 10_000)
        val beforeReboot = StepBanking.apply(baseline.newState, today, bootCount = 1, rawStepsSinceBoot = 13_000)
        val justAfterReboot = StepBanking.apply(beforeReboot.newState, today, bootCount = 2, rawStepsSinceBoot = 12)
        val laterAfterReboot = StepBanking.apply(justAfterReboot.newState, today, bootCount = 2, rawStepsSinceBoot = 512)

        // 3,000 banked from before the reboot + 500 walked since it.
        assertEquals(3500, laterAfterReboot.stepsToday)
    }

    @Test
    fun `multiple reboots in the same day all get banked`() {
        var state = StepBanking.apply(previous = null, today = today, bootCount = 1, rawStepsSinceBoot = 1000).newState
        state = StepBanking.apply(state, today, bootCount = 1, rawStepsSinceBoot = 2000).newState // +1000
        state = StepBanking.apply(state, today, bootCount = 2, rawStepsSinceBoot = 50).newState // reboot, banks 1000
        state = StepBanking.apply(state, today, bootCount = 2, rawStepsSinceBoot = 800).newState // +750
        val final = StepBanking.apply(state, today, bootCount = 3, rawStepsSinceBoot = 5) // reboot, banks 750 more

        assertEquals(1000 + 750, final.stepsToday)
    }

    @Test
    fun `a new calendar day resets to zero even in the same boot session`() {
        val yesterdayEnd = StepBanking.apply(previous = null, today = yesterday, bootCount = 1, rawStepsSinceBoot = 8000)
        val todayStart = StepBanking.apply(yesterdayEnd.newState, today, bootCount = 1, rawStepsSinceBoot = 8010)

        assertEquals(0, todayStart.stepsToday)
        assertEquals(8010, todayStart.newState.sessionBaseline)
    }

    @Test
    fun `a reboot exactly at the day boundary is still handled correctly`() {
        val yesterdayEnd = StepBanking.apply(previous = null, today = yesterday, bootCount = 1, rawStepsSinceBoot = 8000)
        // Both the day changed AND the device rebooted before the next reading.
        val todayStart = StepBanking.apply(yesterdayEnd.newState, today, bootCount = 2, rawStepsSinceBoot = 3)

        // The day-change branch wins: today starts at 0, not at whatever
        // yesterday's banking arithmetic would have produced.
        assertEquals(0, todayStart.stepsToday)
        assertEquals(2, todayStart.newState.sessionBootCount)
    }

    @Test
    fun `an out-of-order lower reading within a session never decreases the total`() {
        val first = StepBanking.apply(previous = null, today = today, bootCount = 1, rawStepsSinceBoot = 500)
        val higher = StepBanking.apply(first.newState, today, bootCount = 1, rawStepsSinceBoot = 700)
        // A spurious/duplicate delivery reporting a lower value than one we've already seen this session.
        val spurious = StepBanking.apply(higher.newState, today, bootCount = 1, rawStepsSinceBoot = 650)

        assertEquals(200, spurious.stepsToday)
    }

    @Test
    fun `steps today is never negative`() {
        // Pathological: a reading arrives below the stored session baseline
        // without a boot-count change (shouldn't normally happen, but must
        // not surface as negative steps if it does).
        val state = DailyStepState(date = today, bankedSteps = 0, sessionBaseline = 500, lastRawInSession = 500, sessionBootCount = 1)
        val outcome = StepBanking.apply(state, today, bootCount = 1, rawStepsSinceBoot = 100)

        assertEquals(0, outcome.stepsToday)
    }
}
