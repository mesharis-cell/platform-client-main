"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type MaintenanceDecision = "FIX_IN_ORDER" | "USE_AS_IS";

export type MaintenanceFeasibilityIssue = {
    asset_id: string;
    asset_name: string;
    refurb_days_estimate: number;
    earliest_feasible_date: string;
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
     */
    lead_floor_date: string;
};

export function useMaintenanceFeasibilityCheck() {
    return useMutation({
        mutationFn: async (payload: {
            items: Array<{ asset_id: string; maintenance_decision?: MaintenanceDecision }>;
            event_start_date: string;
        }): Promise<MaintenanceFeasibilityResult> => {
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
 * Proactive feasibility preview — runs the same check the submit path runs,
 * but with a sentinel past date ("1970-01-01") so the API returns
 * earliest_feasible_date per item regardless of what the user has picked
 * (or hasn't picked) yet. Caller derives the floor by max()-ing those
 * earliest_feasible_date values.
 *
 * Used by the installation-step helper and the review-step re-check. Query
 * auto-refires when `items` (including maintenance_decision changes) changes.
 */
const FEASIBILITY_SENTINEL_DATE = "1970-01-01";

export function useFeasibilityPreview({
    items,
    enabled = true,
}: {
    items: Array<{ asset_id: string; maintenance_decision?: MaintenanceDecision }>;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: ["feasibility-preview", items],
        queryFn: async (): Promise<MaintenanceFeasibilityResult> => {
            const response = await apiClient.post(
                "/client/v1/order/check-maintenance-feasibility",
                {
                    items,
                    event_start_date: FEASIBILITY_SENTINEL_DATE,
                }
            );
            return response.data.data as MaintenanceFeasibilityResult;
        },
        enabled: enabled && items.length > 0,
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

/**
 * Given a preview result + the user's picked date, return a plain-English
 * status the UI can render. Centralizes the interpretation so both the
 * installation-step helper and the review-step per-item warning draw from
 * the same source.
 */
export function interpretFeasibilityPreview(
    result: MaintenanceFeasibilityResult | undefined,
    userEventDate: string // YYYY-MM-DD or ""
): {
    /**
     * The earliest date (YYYY-MM-DD) any of the cart's items can be ready
     * on, or null if nothing in the cart requires prep.
     */
    floorDate: string | null;
    /** True when user has picked a date AND it's on/after the floor. */
    userDateFeasible: boolean | null; // null when userEventDate is ""
    /**
     * Items whose earliest ready date exceeds the user's picked date. Empty
     * when the picked date is feasible or no date picked.
     */
    blockingItems: MaintenanceFeasibilityIssue[];
} {
    if (!result) {
        return { floorDate: null, userDateFeasible: null, blockingItems: [] };
    }
    // Platform lead-time floor is always returned (even for green-only carts).
    const platformFloor = result.lead_floor_date || null;
    if (result.issues.length === 0) {
        const userDateFeasible =
            userEventDate && platformFloor ? userEventDate >= platformFloor : null;
        return { floorDate: platformFloor, userDateFeasible, blockingItems: [] };
    }
    const issueFloor = result.issues.reduce(
        (max, issue) =>
            issue.earliest_feasible_date > max ? issue.earliest_feasible_date : max,
        result.issues[0].earliest_feasible_date
    );
    // Never propose a date earlier than the platform lead-time floor.
    const floorDate =
        platformFloor && platformFloor > issueFloor ? platformFloor : issueFloor;
    const userDateFeasible = userEventDate ? userEventDate >= floorDate : null;
    const blockingItems = userEventDate
        ? result.issues.filter((i) => i.earliest_feasible_date > userEventDate)
        : [];
    return { floorDate, userDateFeasible, blockingItems };
}
