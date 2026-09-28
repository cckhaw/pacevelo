import { formatChallengeDate, formatSyncTimestamp } from "./dateFormat";

/** Ported from the native app's StepMathTest.kt - same scenarios, same zones. */
describe("formatChallengeDate", () => {
  test("formats a challenge date in UTC regardless of the requested zone", () => {
    // 11pm UTC on the 24th is still the 24th in UTC, even though it'd
    // already be the 25th in a positive-offset zone - formatChallengeDate
    // always reads it as the server's own UTC calendar day.
    expect(formatChallengeDate("2026-09-24T23:00:00.000Z")).toBe("Sep 24, 2026");
  });
});

describe("formatSyncTimestamp", () => {
  test("formats a sync timestamp in the given zone", () => {
    // Zones without DST, so the offset (and this test) can't drift with the
    // calendar: Asia/Singapore is a fixed UTC+8, Pacific/Honolulu a fixed UTC-10.
    const iso = "2026-09-25T02:00:00.000Z";

    expect(formatSyncTimestamp(iso, "UTC")).toBe("Sep 25, 2026, 2:00 AM");
    expect(formatSyncTimestamp(iso, "Asia/Singapore")).toBe("Sep 25, 2026, 10:00 AM");
    // UTC-10 shifts this same instant back into the previous calendar day.
    expect(formatSyncTimestamp(iso, "Pacific/Honolulu")).toBe("Sep 24, 2026, 4:00 PM");
  });
});
