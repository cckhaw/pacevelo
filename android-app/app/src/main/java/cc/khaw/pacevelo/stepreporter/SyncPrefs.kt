package cc.khaw.pacevelo.stepreporter

import android.content.Context

/**
 * Local device storage for the scanned setup URL (the same personal
 * dashboard URL /dashboard/devices shows for the iOS Shortcut, already
 * carrying the profile's bearer token as a query param) and the
 * day-boundary baseline used to turn the cumulative TYPE_STEP_COUNTER
 * sensor value into "steps today".
 */
object SyncPrefs {
    private const val PREFS_NAME = "pacevelo_step_reporter"
    private const val KEY_SYNC_URL = "sync_url"
    private const val KEY_BASELINE_DATE = "baseline_date"
    private const val KEY_BASELINE_STEPS = "baseline_steps"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getSyncUrl(context: Context): String? = prefs(context).getString(KEY_SYNC_URL, null)

    fun setSyncUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_SYNC_URL, url).apply()
    }

    fun isConfigured(context: Context): Boolean = !getSyncUrl(context).isNullOrBlank()

    /** Returns null if there's no baseline for today yet - the caller should then set one from the current raw sensor reading. */
    fun getBaselineForToday(context: Context, today: String): Int? {
        val p = prefs(context)
        if (p.getString(KEY_BASELINE_DATE, null) != today) return null
        return if (p.contains(KEY_BASELINE_STEPS)) p.getInt(KEY_BASELINE_STEPS, 0) else null
    }

    fun setBaseline(context: Context, date: String, rawSteps: Int) {
        prefs(context).edit()
            .putString(KEY_BASELINE_DATE, date)
            .putInt(KEY_BASELINE_STEPS, rawSteps)
            .apply()
    }
}
