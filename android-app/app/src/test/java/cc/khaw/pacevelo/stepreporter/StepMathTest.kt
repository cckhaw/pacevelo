package cc.khaw.pacevelo.stepreporter

import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

/** Covers the date/time formatting shown once connected (account, challenge period, last sync) - pure functions, no device needed. */
class StepMathTest {

    @Test
    fun `formats a challenge date in UTC regardless of the requested zone`() {
        // 11pm UTC on the 24th is still the 24th in UTC, even though it'd
        // already be the 25th in a positive-offset zone - formatChallengeDate
        // always reads it as the server's own UTC calendar day.
        assertEquals("Sep 24, 2026", StepMath.formatChallengeDate("2026-09-24T23:00:00.000Z"))
    }

    @Test
    fun `formats a sync timestamp in the given zone`() {
        // Zones without DST, so the offset (and this test) can't drift with
        // the calendar: Asia/Singapore is a fixed UTC+8, Pacific/Honolulu a
        // fixed UTC-10.
        val iso = "2026-09-25T02:00:00.000Z"

        assertEquals("Sep 25, 2026, 2:00 AM", StepMath.formatSyncTimestamp(iso, ZoneId.of("UTC")))
        assertEquals("Sep 25, 2026, 10:00 AM", StepMath.formatSyncTimestamp(iso, ZoneId.of("Asia/Singapore")))
        // UTC-10 shifts this same instant back into the previous calendar day.
        assertEquals("Sep 24, 2026, 4:00 PM", StepMath.formatSyncTimestamp(iso, ZoneId.of("Pacific/Honolulu")))
    }
}
