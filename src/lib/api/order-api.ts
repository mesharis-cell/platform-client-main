/**
 * Order API Client
 * API wrapper for order submission and management
 */

import type { TripType } from "@/types/hybrid-pricing";

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
    transport_trip_type?: TripType; // NEW
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
    transport_trip_type: TripType;
}) {
    const response = await fetch("/api/orders/estimate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to calculate estimate");
    }

    return response.json();
}
