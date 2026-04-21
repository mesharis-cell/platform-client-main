/**
 * Compose a zoned ISO-8601 datetime from date + time + IANA timezone.
 *
 * The native `<input type="date">` gives us a YYYY-MM-DD string, and
 * `<input type="time">` gives us an HH:MM string — but neither carries a
 * timezone. The feasibility API compares against `Date.now()` in the
 * platform timezone, so we must send the user's wall-clock selection as
 * a full ISO datetime whose offset matches the platform TZ.
 *
 * Approach: use `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`
 * to resolve the offset at the specific event moment. This is DST-aware
 * and handles half-hour / quarter-hour TZs correctly (e.g. Asia/Kolkata
 * `+05:30`, Asia/Kathmandu `+05:45`).
 *
 * No npm dependency — mirrors the native Intl pattern already used by the
 * API in `order-feasibility.utils.ts:93-138`.
 *
 * Returns null when any input is missing/empty or the timezone is invalid,
 * so callers can guard the feasibility query without throwing.
 *
 * Examples:
 *   composeZonedISO({ date: "2026-05-15", time: "14:30", timezone: "Asia/Dubai" })
 *   // → "2026-05-15T14:30:00+04:00"
 *
 *   composeZonedISO({ date: "2026-11-01", time: "02:00", timezone: "America/New_York" })
 *   // → "2026-11-01T02:00:00-04:00"   (DST before fall-back)
 */
export function composeZonedISO({
    date,
    time,
    timezone,
}: {
    date: string | null | undefined;
    time: string | null | undefined;
    timezone: string | null | undefined;
}): string | null {
    if (!date || !time || !timezone) return null;

    // Basic shape guards — YYYY-MM-DD and HH:MM (or HH:MM:SS). Reject
    // anything else rather than silently producing a malformed ISO.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return null;
    const timeWithSeconds = time.length === 5 ? `${time}:00` : time;

    // Ask Intl for the offset of the target TZ at a specific UTC instant.
    // Returns null on unknown TZ or malformed `longOffset` string.
    const getOffsetAt = (instant: Date): string | null => {
        try {
            const parts = new Intl.DateTimeFormat("en-GB", {
                timeZone: timezone,
                timeZoneName: "longOffset",
            }).formatToParts(instant);
            const tz = parts.find((p) => p.type === "timeZoneName")?.value;
            if (!tz || !tz.startsWith("GMT")) return null;
            // `GMT+04:00` → `+04:00`; bare `GMT` (UTC) → `+00:00`.
            const raw = tz.slice(3);
            return raw === "" ? "+00:00" : raw;
        } catch {
            return null;
        }
    };

    // We want the offset AT the real event instant, but we don't know that
    // instant yet — only the wall-clock reading. Two passes:
    //   pass 1: pretend wall-clock is UTC, get offset → gives a provisional
    //           instant that's off by however many hours that offset is.
    //   pass 2: construct the real instant from wall-clock + provisional
    //           offset and re-query. If the TZ has a DST transition between
    //           the probe instant and the real instant, the offset here
    //           will differ — use the second answer.
    // Converges in one correction step for standard DST jumps; idempotent
    // for non-DST zones (Dubai, UTC, etc.).
    const probe = new Date(`${date}T${timeWithSeconds}Z`);
    if (Number.isNaN(probe.getTime())) return null;
    const provisional = getOffsetAt(probe);
    if (!provisional) return null;

    const actualInstant = new Date(`${date}T${timeWithSeconds}${provisional}`);
    if (Number.isNaN(actualInstant.getTime())) return null;
    const corrected = getOffsetAt(actualInstant);
    const offset = corrected ?? provisional;

    return `${date}T${timeWithSeconds}${offset}`;
}
