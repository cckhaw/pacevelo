package cc.khaw.pacevelo.stepreporter

import android.content.Context

/**
 * Local device storage for the scanned setup URL - the same personal
 * dashboard URL /dashboard/devices shows for the iOS Shortcut, already
 * carrying the profile's bearer token as a query param. See
 * DailyStepTracker for the separate (and separately persisted) day/boot
 * tracking state.
 */
object SyncPrefs {
    private const val PREFS_NAME = "pacevelo_step_reporter"
    private const val KEY_SYNC_URL = "sync_url"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getSyncUrl(context: Context): String? = prefs(context).getString(KEY_SYNC_URL, null)

    fun setSyncUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_SYNC_URL, url).apply()
    }

    fun isConfigured(context: Context): Boolean = !getSyncUrl(context).isNullOrBlank()
}
