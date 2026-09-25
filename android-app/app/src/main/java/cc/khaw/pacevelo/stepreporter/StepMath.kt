package cc.khaw.pacevelo.stepreporter

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object StepMath {
    /** The device's own local calendar date, matching what the server's /api/devices/steps expects. */
    fun todayLocalDate(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
}
