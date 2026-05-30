"use client";

/**
 * Order Editing hooks (order-editing feature, Phase 1 — descriptive fields only).
 *
 * The single PATCH /client/v1/order/:id endpoint serves BOTH an order's owner
 * AND a company back-office manager editing a colleague's order — the server
 * resolves scope from the caller's permissions, so there is no separate company
 * variant. Only changed, allowlisted descriptive fields are ever sent.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export interface OrderEditPayload {
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    // Venue contact is sent as TOP-LEVEL columns (not nested in permit_requirements).
    venue_contact_name?: string | null;
    venue_contact_email?: string | null;
    venue_contact_phone?: string | null;
    venue_name?: string;
    venue_city_id?: string;
    venue_location?: {
        country?: string;
        city?: string;
        address?: string;
        access_notes?: string;
    };
    special_instructions?: string | null;
    permit_requirements?: {
        requires_permit: boolean;
        permit_owner?: "CLIENT" | "PLATFORM" | "UNKNOWN";
        requires_vehicle_docs?: boolean;
        requires_staff_ids?: boolean;
        notes?: string;
    } | null;
    is_permanent_placement?: boolean;
    po_number?: string | null;
    // Event dates (ISO strings). Editing these re-derives the booking window
    // server-side; insufficient availability returns 409 with a descriptive
    // message. A QUOTED order reverts to PRICING_REVIEW + QUOTE_REVISED.
    event_start_date?: string;
    event_end_date?: string;
    // Existing-item quantity changes (P3b). Each entry retargets the booking for
    // one already-present order item; the server reconciles bookings (409 on
    // insufficient availability) and reprices BASE_OPS. Send ONLY changed items;
    // omit the key entirely when no quantity changed.
    items?: { order_item_id: string; quantity: number }[];
}

export interface OrderEditResponseData {
    changed_fields: { field: string; old: unknown; new: unknown }[];
    status: string;
    financial_status: string;
    status_reverted: boolean;
}

/**
 * Patch an order's descriptive details. `orderId` is the UUID (`order.id`).
 * Invalidates the detail query by PREFIX so both the owner view
 * (["client-order-detail", id, false]) and the company-manager view
 * (["client-order-detail", id, true]) refetch, plus the lists/summary.
 */
export function useUpdateOrderDetails(orderId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (body: OrderEditPayload): Promise<OrderEditResponseData> => {
            try {
                const response = await apiClient.patch(`/client/v1/order/${orderId}`, body);
                return response.data?.data as OrderEditResponseData;
            } catch (error) {
                return throwApiError(error) as never;
            }
        },
        onSuccess: () => {
            // Prefix-invalidate: the detail key has a trailing boolean scope element.
            queryClient.invalidateQueries({ queryKey: ["client-order-detail", orderId] });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
            queryClient.invalidateQueries({ queryKey: ["client-dashboard-summary"] });
        },
    });
}
