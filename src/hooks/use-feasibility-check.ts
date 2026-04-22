"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type MaintenanceDecision = "FIX_IN_ORDER" | "USE_AS_IS";

export type MaintenanceFeasibilityIssue = {
    asset_id: string;
    asset_name: string;
    refurb_days_estimate: number;
    /** YYYY-MM-DD — kept for back-compat; prefer `earliest_feasible_datetime`. */
    earliest_feasible_date: string;
    /** ISO 8601 UTC datetime — precise floor moment for the asset. */
    earliest_feasible_datetime: string;
    condition: "RED" | "ORANGE";
    maintenance_mode: "MANDATORY_RED" | "OPTIONAL_ORANGE_FIX";
    message: string;
};

export type MaintenanceFeasibilityResult = {
    feasible: boolean;
    issues: MaintenanceFeasibilityIssue[];
    config: {
        minimum_lead_hours: number;
        exclude_weekends: boolean;
        weekend_days: number[];
        timezone: string;
    };
    /**
     * Earliest calendar date (YYYY-MM-DD) anyone can use, derived from the
     * platform's minimum_lead_hours + weekend skip rules. Always present for
     * every cart (including green-only ones with no per-item issues).
     * @deprecated Prefer `lead_floor_datetime` for precise display.
     */
    lead_floor_date: string;
    /**
     * ISO 8601 UTC datetime form of `lead_floor_date`. Precise to the
     * minute; client formats in platform TZ for display.
     */
    lead_floor_datetime: string;
};

/**
 * Accepts either `event_start_date` (legacy, YYYY-MM-DD) or
 * `event_start_datetime` (new, ISO 8601 with TZ offset). Server requires
 * at least one via superRefine; when both are sent, `event_start_datetime`
 * wins. Callers should send `event_start_datetime` composed via
 * `composeZonedISO` from `@/lib/feasibility/compose-datetime`.
 */
export type MaintenanceFeasibilityPayload = {
    items: Array<{ asset_id: string; maintenance_decision?: MaintenanceDecision }>;
    event_start_date?: string;
    event_start_datetime?: string;
};

/**
 * Imperative mutation wrapper. Kept for explicit-check call sites that
 * need an awaited POST (currently: installation-step Next, final Submit).
 * New code should prefer `useFeasibility` which auto-fires on input change
 * and exposes the same result via its cached query data.
 */
export function useMaintenanceFeasibilityCheck() {
    return useMutation({
        mutationFn: async (
            payload: MaintenanceFeasibilityPayload
        ): Promise<MaintenanceFeasibilityResult> => {
            try {
                const response = await apiClient.post(
                    "/client/v1/order/check-maintenance-feasibility",
                    payload
                );
                return response.data.data as MaintenanceFeasibilityResult;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export type FeasibilityConfig = {
    minimum_lead_hours: number;
    exclude_weekends: boolean;
    weekend_days: number[];
    timezone: string;
};

export function useFeasibilityConfig() {
    return useQuery({
        queryKey: ["feasibility-config"],
        queryFn: async (): Promise<FeasibilityConfig> => {
            const response = await apiClient.get("/client/v1/order/feasibility-config");
            return response.data.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export type RedFeasibilityIssue = MaintenanceFeasibilityIssue;
export type RedFeasibilityResult = MaintenanceFeasibilityResult;
export const useRedFeasibilityCheck = useMaintenanceFeasibilityCheck;

/**
 * Consolidated feasibility subscription. Auto-fires on any input change —
 * items list, maintenance_decision flip, AND eventStartDatetime change
 * (including time-of-day edits). This is the single source of truth for
 * all three checkout surfaces: the advisory helper, the installation-step
 * Next gate, and the final submit validation.
 *
 * IMPORTANT: callers MUST memoize `items` and `eventStartDatetime` with
 * fine-grained deps (`useMemo`). Passing a new array / new string on every
 * render causes queryKey churn and a refetch loop. `items` is serialized
 * via JSON.stringify inside the queryKey to make the key stable by value.
 *
 * `eventStartDatetime === null` disables the query — used when the user
 * hasn't picked a date+time yet, OR when platform timezone config hasn't
 * loaded yet. The UI should render loading/prompt states in that mode.
 *
 * Retires the old sentinel-date pattern (was posting `"1970-01-01"` to
 * probe for floor-date). The new pattern sends the real user datetime;
 * the server's response always includes `lead_floor_datetime` regardless,
 * so floor-date display still works once the user has picked something.
 */
export function useFeasibility({
    items,
    eventStartDatetime,
    enabled = true,
}: {
    items: Array<{ asset_id: string; maintenance_decision?: MaintenanceDecision }>;
    eventStartDatetime: string | null;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: ["feasibility", JSON.stringify(items), eventStartDatetime],
        queryFn: async (): Promise<MaintenanceFeasibilityResult> => {
            const response = await apiClient.post(
                "/client/v1/order/check-maintenance-feasibility",
                {
                    items,
                    event_start_datetime: eventStartDatetime!,
                }
            );
            return response.data.data as MaintenanceFeasibilityResult;
        },
        enabled: enabled && items.length > 0 && eventStartDatetime !== null,
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

/**
 * @deprecated — use `useFeasibility` instead. Preserved only as an alias
 * so any stale imports don't break compilation mid-migration. Callers MUST
 * supply a real `eventStartDatetime`; the old sentinel-date pattern is retired.
 */
export const useFeasibilityPreview = useFeasibility;

/**
 * Given a feasibility result + the user's picked date/datetime, return a
 * plain-English status the UI can render. Centralizes the interpretation
 * so the helper, the Next-gate, and the per-item warning draw from one
 * source.
 *
 * Pass `userEventDatetime` (ISO 8601 with offset) whenever available —
 * comparison is then time-of-day precise and matches the server's
 * datetime-based feasibility verdict. `userEventDate` (YYYY-MM-DD) is
 * kept as a fallback for the initial render before the composer has a
 * time component, and as the source for computing blockingItems which
 * are reported per-calendar-date on the server response.
 */
export function interpretFeasibilityPreview(
    result: MaintenanceFeasibilityResult | undefined,
    userEventDate: string, // YYYY-MM-DD or ""
    userEventDatetime: string | null = null // ISO 8601 or null
): {
    /**
     * The earliest date (YYYY-MM-DD) any of the cart's items can be ready
     * on, or null if nothing in the cart requires prep.
     */
    floorDate: string | null;
    /**
     * The earliest ISO datetime any cart item can be ready at. More precise
     * than floorDate. Null when no prep is required or result is undefined.
     */
    floorDatetime: string | null;
    /** True when user has picked a date AND it's on/after the floor. */
    userDateFeasible: boolean | null; // null when userEventDate is ""
    /**
     * Items whose earliest ready date exceeds the user's picked date. Empty
     * when the picked date is feasible or no date picked.
     */
    blockingItems: MaintenanceFeasibilityIssue[];
} {
    if (!result) {
        return {
            floorDate: null,
            floorDatetime: null,
            userDateFeasible: null,
            blockingItems: [],
        };
    }
    // Platform lead-time floor is always returned (even for green-only carts).
    const platformFloor = result.lead_floor_date || null;
    const platformFloorDatetime = result.lead_floor_datetime || null;

    // Prefer datetime comparison (matches server's Phase 3 verdict to the
    // millisecond). Fall back to date-only when datetime isn't composable
    // yet (e.g. time not picked, or platform TZ config still loading).
    const compareUserAgainstFloor = (floorDate: string, floorDatetime: string | null) => {
        if (userEventDatetime && floorDatetime) {
            return new Date(userEventDatetime).getTime() >= new Date(floorDatetime).getTime();
        }
        if (userEventDate) {
            return userEventDate >= floorDate;
        }
        return null;
    };

    if (result.issues.length === 0) {
        const userDateFeasible = platformFloor
            ? compareUserAgainstFloor(platformFloor, platformFloorDatetime)
            : null;
        return {
            floorDate: platformFloor,
            floorDatetime: platformFloorDatetime,
            userDateFeasible,
            blockingItems: [],
        };
    }
    const issueFloor = result.issues.reduce(
        (max, issue) => (issue.earliest_feasible_date > max ? issue.earliest_feasible_date : max),
        result.issues[0].earliest_feasible_date
    );
    const issueFloorDatetime = result.issues.reduce(
        (max, issue) =>
            issue.earliest_feasible_datetime > max ? issue.earliest_feasible_datetime : max,
        result.issues[0].earliest_feasible_datetime
    );
    // Never propose a date earlier than the platform lead-time floor.
    const floorDate = platformFloor && platformFloor > issueFloor ? platformFloor : issueFloor;
    const floorDatetime =
        platformFloorDatetime && platformFloorDatetime > issueFloorDatetime
            ? platformFloorDatetime
            : issueFloorDatetime;
    const userDateFeasible = compareUserAgainstFloor(floorDate, floorDatetime);
    // blockingItems remain date-granular: the per-item issue is "this asset
    // can't be ready on that calendar day." Time-of-day nuance is captured
    // at the aggregate floor above.
    const blockingItems = userEventDate
        ? result.issues.filter((i) => i.earliest_feasible_date > userEventDate)
        : [];
    return { floorDate, floorDatetime, userDateFeasible, blockingItems };
}
