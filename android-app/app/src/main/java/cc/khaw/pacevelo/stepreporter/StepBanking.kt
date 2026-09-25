package cc.khaw.pacevelo.stepreporter

/** Everything DailyStepTracker needs to persist between readings, in one immutable value. */
data class DailyStepState(
    val date: String,
    val bankedSteps: Int,
    val sessionBaseline: Int,
    val lastRawInSession: Int,
    val sessionBootCount: Int,
)

/**
 * The pure day/boot-banking arithmetic behind DailyStepTracker, split out so
 * it can be unit-tested on the plain JVM (no Context, no real device, no
 * emulator) against every reboot scenario that matters - this is the part
 * that has to be exactly right; DailyStepTracker is just its Android-facing
 * shell (SharedPreferences + Settings.Global.BOOT_COUNT).
 */
object StepBanking {
    data class Outcome(val newState: DailyStepState, val stepsToday: Int)

    fun apply(
        previous: DailyStepState?,
        today: String,
        bootCount: Int,
        rawStepsSinceBoot: Int,
    ): Outcome {
        if (previous == null || previous.date != today) {
            // New day (or first run ever): today starts at 0, tracked from
            // this exact reading in whichever boot session we're in right
            // now. Checked before the boot-count comparison below, so a
            // reboot that happens to coincide with a day change is still
            // handled correctly - there's nothing from "yesterday" worth
            // preserving either way.
            val state = DailyStepState(
                date = today,
                bankedSteps = 0,
                sessionBaseline = rawStepsSinceBoot,
                lastRawInSession = rawStepsSinceBoot,
                sessionBootCount = bootCount,
            )
            return Outcome(state, 0)
        }

        if (bootCount != previous.sessionBootCount) {
            // A reboot happened since our last reading. The sensor's old
            // session is gone and unreadable now, so the last value we
            // actually recorded from it is the only record of how many
            // steps it saw - bank that permanently, then start a fresh
            // session baseline from this post-reboot reading.
            val sessionSteps = (previous.lastRawInSession - previous.sessionBaseline).coerceAtLeast(0)
            val banked = previous.bankedSteps + sessionSteps
            val state = DailyStepState(
                date = today,
                bankedSteps = banked,
                sessionBaseline = rawStepsSinceBoot,
                lastRawInSession = rawStepsSinceBoot,
                sessionBootCount = bootCount,
            )
            return Outcome(state, banked)
        }

        // Same day, same boot session: extend it. maxOf guards against a
        // spurious out-of-order reading rather than trusting the sensor to
        // always deliver strictly increasing values within one session.
        val newLastRaw = maxOf(previous.lastRawInSession, rawStepsSinceBoot)
        val state = previous.copy(lastRawInSession = newLastRaw)
        val stepsToday = previous.bankedSteps + (newLastRaw - previous.sessionBaseline).coerceAtLeast(0)
        return Outcome(state, stepsToday)
    }
}
