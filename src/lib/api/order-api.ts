/**
 * Order API Client
 * API wrapper for order submission and management
 */

import type { TripType } from "@/types/hybrid-pricing";
import { throwApiError } from "../utils/throw-api-error";
import { apiClient } from "./api-client";

export interface SubmitOrderPayload {
    items: Array<{
        asset_id: string;
        quantity: number;
        from_collection_id?: string;
        // NEW: Rebrand fields
        is_reskin_request?: boolean;
        reskin_target_brand_id?: string;
        reskin_target_brand_custom?: string;
        reskin_notes?: string;
    }>;
    brand_id?: string;
    trip_type?: TripType; // NEW
    event_start_date: string;
    event_end_date: string;
    venue_name: string;
    venue_country: string;
    venue_city: string;
    venue_address: string;
    venue_access_notes?: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    special_instructions?: string;
}

/**
 * Submit order with hybrid pricing and rebrand support
 */
export async function submitOrder(payload: SubmitOrderPayload) {
    const response = await fetch("/api/orders/submit-from-cart", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit order");
    }

    return response.json();
}

/**
 * Calculate order estimate
 */
export async function calculateEstimate(data: {
    items: Array<{ asset_id: string; quantity: number }>;
    venue_city: string;
    trip_type: TripType;
}) {
    try {
        const response = await apiClient.post("/client/v1/order/estimate", data);
        return response.data;
    } catch (error) {
        console.error("Failed to calculate estimate:", error);
        throwApiError(error);
    }
}
