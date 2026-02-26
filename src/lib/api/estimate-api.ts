/**
 * Estimate API Client
 * Dedicated API functions for pricing estimates
 */

import type { TripType, OrderEstimate } from "@/types/hybrid-pricing";

export interface EstimateRequest {
    items: Array<{
        asset_id: string;
        quantity: number;
    }>;
    venue_city: string;
    trip_type: TripType;
}

/**
 * Calculate order estimate
 */
export async function calculateEstimate(
    data: EstimateRequest
): Promise<{ estimate: OrderEstimate }> {
    const response = await fetch("/api/orders/estimate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to calculate estimate");
    }

    const result = await response.json();
    return result.data || result;
}
