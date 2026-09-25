package cc.khaw.pacevelo.stepreporter

import java.text.SimpleDateFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale

object StepMath {
    /** The device's own local calendar date, matching what the server's /api/devices/steps expects. */
    fun todayLocalDate(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private val datePattern = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)
    private val dateTimePattern = DateTimeFormatter.ofPattern("MMM d, yyyy, h:mm a", Locale.US)

    /** "Sep 25, 2026" from a challenge's ISO start/end date - shown in UTC since that's the calendar day the server itself scores by, matching the dashboard. */
    fun formatChallengeDate(iso: String): String = datePattern.withZone(ZoneId.of("UTC")).format(Instant.parse(iso))

    /** "Sep 25, 2026, 2:30 PM" from a sync's ISO timestamp - in `zone` (the phone's own local time zone by default), since this is when *this device* last saw it happen. */
    fun formatSyncTimestamp(iso: String, zone: ZoneId = ZoneId.systemDefault()): String =
        dateTimePattern.withZone(zone).format(Instant.parse(iso))
}
