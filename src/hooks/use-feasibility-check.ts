"use client";

import { useMutation } from "@tanstack/react-query";
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

export type RedFeasibilityIssue = MaintenanceFeasibilityIssue;
export type RedFeasibilityResult = MaintenanceFeasibilityResult;
export const useRedFeasibilityCheck = useMaintenanceFeasibilityCheck;
