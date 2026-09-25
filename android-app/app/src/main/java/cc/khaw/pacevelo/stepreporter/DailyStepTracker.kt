package cc.khaw.pacevelo.stepreporter

import android.content.Context
import android.provider.Settings

/**
 * Turns the cumulative TYPE_STEP_COUNTER sensor value (steps since the
 * device last booted, per Android's docs) into "steps today" - correctly,
 * even if the device reboots one or more times during the day.
 *
 * The naive approach (today's steps = raw value - value seen at the start
 * of today) breaks the moment a reboot happens: the sensor resets towards
 * zero, so a fresh "start of today" baseline taken *after* the reboot
 * discards every step actually taken earlier that day. StepBanking (see
 * that file for the actual arithmetic, and its unit tests for the
 * scenarios it's checked against) avoids that by "banking" a boot
 * session's steps into a running total the moment it detects that session
 * has ended, using Settings.Global.BOOT_COUNT - a plain integer Android
 * increments on every single boot - as the signal. Unlike a wall-clock or
 * elapsedRealtime comparison, BOOT_COUNT can't be fooled by clock drift,
 * NTP corrections, or timezone changes: either it changed (a reboot
 * happened) or it didn't.
 *
 * This class only owns reading/writing that state to SharedPreferences, so
 * a reboot happening between app runs (including while the app isn't in
 * the foreground) is handled correctly next time either the app or the
 * background worker takes a reading.
 *
 * The one gap this can't close: steps taken after midnight but before the
 * app or its background sync next runs are only counted from whenever that
 * first reading of the new day happens - there's no way to attribute steps
 * to "today" before anything has observed today at all. The ~15-minute
 * WorkManager sync keeps that gap small in practice.
 */
object DailyStepTracker {
    private const val PREFS_NAME = "pacevelo_step_reporter"
    private const val KEY_DATE = "tracker_date"
    private const val KEY_BANKED_STEPS = "tracker_banked_steps"
    private const val KEY_SESSION_BASELINE = "tracker_session_baseline"
    private const val KEY_LAST_RAW_IN_SESSION = "tracker_last_raw_in_session"
    private const val KEY_SESSION_BOOT_COUNT = "tracker_session_boot_count"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun currentBootCount(context: Context): Int =
        Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)

    private fun loadState(p: android.content.SharedPreferences): DailyStepState? {
        val date = p.getString(KEY_DATE, null) ?: return null
        return DailyStepState(
            date = date,
            bankedSteps = p.getInt(KEY_BANKED_STEPS, 0),
            sessionBaseline = p.getInt(KEY_SESSION_BASELINE, 0),
            lastRawInSession = p.getInt(KEY_LAST_RAW_IN_SESSION, 0),
            sessionBootCount = p.getInt(KEY_SESSION_BOOT_COUNT, -1),
        )
    }

    private fun saveState(p: android.content.SharedPreferences, state: DailyStepState) {
        p.edit()
            .putString(KEY_DATE, state.date)
            .putInt(KEY_BANKED_STEPS, state.bankedSteps)
            .putInt(KEY_SESSION_BASELINE, state.sessionBaseline)
            .putInt(KEY_LAST_RAW_IN_SESSION, state.lastRawInSession)
            .putInt(KEY_SESSION_BOOT_COUNT, state.sessionBootCount)
            .apply()
    }

    /**
     * Feeds one new raw sensor reading in and returns the resulting "steps
     * today" - persisting whatever state is needed to get the next call
     * right too, whether that's a moment later or after a reboot.
     */
    fun recordReading(context: Context, rawStepsSinceBoot: Int): Int {
        val p = prefs(context)
        val outcome = StepBanking.apply(
            previous = loadState(p),
            today = StepMath.todayLocalDate(),
            bootCount = currentBootCount(context),
            rawStepsSinceBoot = rawStepsSinceBoot,
        )
        saveState(p, outcome.newState)
        return outcome.stepsToday
    }
}
