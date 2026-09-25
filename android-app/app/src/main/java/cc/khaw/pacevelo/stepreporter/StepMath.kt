package cc.khaw.pacevelo.stepreporter

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object StepMath {
    /** The device's own local calendar date, matching what the server's /api/devices/steps expects. */
    fun todayLocalDate(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    /**
     * TYPE_STEP_COUNTER reports steps *since the device last rebooted*, not
     * "today" - so today's count is that raw value minus whatever it read
     * at the start of today (the "baseline"). The very first reading of a
     * new day becomes that day's baseline (today's count starts at 0), and
     * every later reading that day is measured against it.
     */
    fun todaysSteps(context: Context, rawStepsSinceBoot: Int): Int {
        val today = todayLocalDate()
        val baseline = SyncPrefs.getBaselineForToday(context, today)
        if (baseline == null) {
            SyncPrefs.setBaseline(context, today, rawStepsSinceBoot)
            return 0
        }
        // A reboot resets the sensor's own counter below our stored baseline
        // on some devices - treat that as a fresh baseline rather than
        // reporting a nonsensical negative count.
        if (rawStepsSinceBoot < baseline) {
            SyncPrefs.setBaseline(context, today, rawStepsSinceBoot)
            return 0
        }
        return rawStepsSinceBoot - baseline
    }
}
