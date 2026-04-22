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

/**
 * Round the floor datetime up to the next 30-minute wall-clock boundary
 * strictly AFTER it, in the given IANA timezone. Returns the rounded
 * HH:MM time plus a `dayOffset` indicating how many days to add to the
 * caller's floor date (non-zero only when the rounded time crossed
 * midnight — e.g. a 23:45 floor rounds to 00:00 the next day).
 *
 * Why rounding? The server-side floor is computed at request time using
 * `Date.now() + lead_hours`. Between the user clicking "Use this date"
 * and the next feasibility check firing, real time advances a few
 * seconds and the new floor ends up slightly later than the one we
 * captured — so an exact-match time (e.g. 09:57:57) reliably loses the
 * race and the helper stays red. Rounding up to the next 30-min
 * boundary buys a comfortable buffer (15–30 min in practice) AND gives
 * the user a clean `10:00` / `10:30` in the time picker instead of a
 * jagged `09:57`.
 *
 * Returns null for invalid inputs so callers can fall back to leaving
 * the user's existing time untouched.
 *
 * Examples:
 *   roundedFloorTimeInZone("2026-04-23T05:57:57Z", "Asia/Dubai")
 *   // → { time: "10:00", dayOffset: 0 }   (UTC 05:57 is 09:57 Dubai → round to 10:00)
 *
 *   roundedFloorTimeInZone("2026-04-23T06:00:00Z", "Asia/Dubai")
 *   // → { time: "10:30", dayOffset: 0 }   (UTC 06:00 is 10:00 Dubai → strictly-greater boundary is 10:30)
 *
 *   roundedFloorTimeInZone("2026-04-23T19:45:00Z", "Asia/Dubai")
 *   // → { time: "00:00", dayOffset: 1 }   (UTC 19:45 is 23:45 Dubai → 00:00 next day)
 */
export function roundedFloorTimeInZone(
    isoDatetime: string | null | undefined,
    timezone: string | null | undefined
): { time: string; dayOffset: number } | null {
    if (!isoDatetime || !timezone) return null;
    const instant = new Date(isoDatetime);
    if (Number.isNaN(instant.getTime())) return null;
    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(instant);
        const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "NaN", 10);
        const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "NaN", 10);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;

        // Round up to the next 30-min boundary STRICTLY AFTER h:m.
        //   m in [0, 29]  → same-hour :30
        //   m in [30, 59] → next-hour :00
        const totalMinutes = m < 30 ? h * 60 + 30 : (h + 1) * 60;
        const minutesInDay = 24 * 60;
        const dayOffset = Math.floor(totalMinutes / minutesInDay);
        const dayMinutes = totalMinutes % minutesInDay;
        const newH = Math.floor(dayMinutes / 60);
        const newM = dayMinutes % 60;
        const time = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
        return { time, dayOffset };
    } catch {
        return null;
    }
}

/**
 * Compute the self-pickup lead-time floor entirely client-side. Mirrors the
 * server-side logic in `api/src/app/shared/feasibility/feasibility.core.ts`:
 *   floor = now + sp_minimum_lead_hours, advanced past any weekend days.
 *
 * The server remains the authoritative gate at submit time; this client-side
 * projection exists only to power the visual helper on the SP checkout page
 * (so the user sees the warning before clicking Submit, not after).
 *
 * Simplification: we advance calendar days (not business-hour-aware) when
 * weekends are excluded. For the 2h default lead this only matters right on
 * a weekend boundary, and the server will reject anything the client lets
 * through.
 */
export function computeSpLeadFloor(config: {
    sp_minimum_lead_hours?: number;
    exclude_weekends?: boolean;
    weekend_days?: number[];
    timezone?: string;
}): { floorDate: string; floorDatetime: string } {
    const leadHours = config.sp_minimum_lead_hours ?? 2;
    const floor = new Date(Date.now() + leadHours * 60 * 60 * 1000);

    if (config.exclude_weekends && config.timezone) {
        const weekendDays = config.weekend_days ?? [0, 6];
        // Advance day-by-day (in the platform TZ) until weekday isn't a weekend.
        const weekdayInTz = (d: Date): number => {
            try {
                const short = new Intl.DateTimeFormat("en-US", {
                    timeZone: config.timezone,
                    weekday: "short",
                }).format(d);
                const map: Record<string, number> = {
                    Sun: 0,
                    Mon: 1,
                    Tue: 2,
                    Wed: 3,
                    Thu: 4,
                    Fri: 5,
                    Sat: 6,
                };
                return map[short] ?? d.getDay();
            } catch {
                return d.getDay();
            }
        };
        while (weekendDays.includes(weekdayInTz(floor))) {
            floor.setUTCDate(floor.getUTCDate() + 1);
        }
    }

    const floorDatetime = floor.toISOString();
    // YYYY-MM-DD portion in the platform timezone (so date-input defaults line
    // up with what the user sees in their calendar).
    let floorDate = floorDatetime.split("T")[0];
    if (config.timezone) {
        try {
            floorDate = new Intl.DateTimeFormat("en-CA", {
                timeZone: config.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(floor);
        } catch {
            // Fall through to UTC-date fallback.
        }
    }
    return { floorDate, floorDatetime };
}

/**
 * Shift a YYYY-MM-DD calendar date by N days (positive or negative).
 * Used by the "Use this date" handlers when rounding the floor time
 * crosses midnight into the next day.
 */
export function shiftDateStr(ymd: string, dayOffset: number): string {
    if (dayOffset === 0) return ymd;
    const [y, mo, d] = ymd.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(Date.UTC(y, mo - 1, d));
    dt.setUTCDate(dt.getUTCDate() + dayOffset);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}
