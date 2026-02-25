"use client";

/**
 * Order Submission Hook
 * Handles order creation with hybrid pricing and rebrand support
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submitOrder, calculateEstimate } from "@/lib/api/order-api";
import type { TripType } from "@/types/hybrid-pricing";

interface CartItem {
    assetId: string;
    quantity: number;
    fromCollectionId?: string;
    isReskinRequest?: boolean;
    reskinTargetBrandId?: string;
    reskinTargetBrandCustom?: string;
    reskinNotes?: string;
    maintenanceDecision?: "FIX_IN_ORDER" | "USE_AS_IS";
}

interface OrderSubmissionData {
    cart: CartItem[];
    tripType: TripType;
    eventData: {
        startDate: string;
        endDate: string;
    };
    venueData: {
        name: string;
        country: string;
        city: string;
        address: string;
        accessNotes?: string;
    };
    contactData: {
        name: string;
        email: string;
        phone: string;
    };
    specialInstructions?: string;
    brandId?: string;
}

/**
 * Calculate order estimate
 */
export function useCalculateEstimate(
    cart: CartItem[],
    venueCity: string,
    tripType: TripType,
    enabled: boolean = true
) {
    // Create a stable key from cart items (assetId + quantity)
    const cartKey = cart.map((item) => `${item.assetId}:${item.quantity}`).join(",");

    return useQuery({
        queryKey: ["order-estimate", cartKey, venueCity, tripType],
        queryFn: async () => {
            if (cart.length === 0 || !venueCity) {
                return null;
            }

            const items = cart.map((item) => ({
                asset_id: item.assetId,
                quantity: item.quantity,
            }));

            return calculateEstimate({
                items,
                venue_city: venueCity,
                trip_type: tripType,
            });
        },
        enabled: enabled && cart.length > 0 && !!venueCity,
    });
}

/**
 * Submit order
 */
export function useSubmitOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: OrderSubmissionData) => {
            const payload = {
                items: data.cart.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    from_collection_id: item.fromCollectionId,
                    maintenance_decision: item.maintenanceDecision,
                })),
                trip_type: data.tripType,
                event_start_date: data.eventData.startDate,
                event_end_date: data.eventData.endDate,
                venue_name: data.venueData.name,
                venue_country_id: data.venueData.country,
                venue_city_id: data.venueData.city,
                venue_address: data.venueData.address,
                venue_access_notes: data.venueData.accessNotes,
                contact_name: data.contactData.name,
                contact_email: data.contactData.email,
                contact_phone: data.contactData.phone,
                special_instructions: data.specialInstructions,
                brand_id: data.brandId,
            };

            return submitOrder(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
        },
    });
}
