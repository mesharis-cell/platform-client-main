"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const selfPickupKeys = {
    list: (params?: Record<string, unknown>) => ["client-self-pickups", params] as const,
    detail: (id: string | null) => ["client-self-pickup", id] as const,
};

export function useClientSelfPickups(
    params: {
        page?: number;
        limit?: number;
        self_pickup_status?: string;
        search?: string;
    } = {}
) {
    return useQuery({
        queryKey: selfPickupKeys.list(params),
        queryFn: async () => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== "") query.set(key, String(value));
            });
            const { data } = await apiClient.get(`/client/v1/self-pickup/my?${query.toString()}`);
            return data;
        },
    });
}

export function useClientSelfPickupDetail(id: string | null, opts: { company?: boolean } = {}) {
    const company = !!opts.company;
    return useQuery({
        // Distinct key per scope (owner vs company) so a peer's pickup can't
        // leak into the owner cache for the same id.
        queryKey: [...selfPickupKeys.detail(id), company],
        queryFn: async () => {
            const path = company
                ? `/client/v1/company/self-pickup/${id}`
                : `/client/v1/self-pickup/${id}`;
            const { data } = await apiClient.get(path);
            return data;
        },
        enabled: !!id,
    });
}

export function useSubmitSelfPickupFromCart() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: any) => {
            const { data } = await apiClient.post(
                "/client/v1/self-pickup/submit-from-cart",
                payload
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
        },
        onError: throwApiError,
    });
}

export function useClientApproveSelfPickupQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            po_number,
            notes,
        }: {
            id: string;
            po_number: string;
            notes?: string;
        }) => {
            const { data } = await apiClient.post(`/client/v1/self-pickup/${id}/approve-quote`, {
                po_number,
                notes,
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}

export function useClientDeclineSelfPickupQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, decline_reason }: { id: string; decline_reason: string }) => {
            const { data } = await apiClient.post(`/client/v1/self-pickup/${id}/decline-quote`, {
                decline_reason,
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}

export function useTriggerSelfPickupReturn() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(`/client/v1/self-pickup/${id}/trigger-return`);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}

/**
 * Self-pickup editing payload (order-editing Phase 4). Mirrors OrderEditPayload
 * but scoped to SP-applicable fields: collector contact, descriptive fields, the
 * pickup_window / expected_return_at booking-window drivers, and item ops.
 *
 * `job_number` is admin-only and is NEVER sent from the client.
 *
 * Only changed, allowlisted keys are ever sent. Editing pickup_window /
 * expected_return_at / items reconciles asset bookings server-side (409 on
 * insufficient availability); removing the last item is rejected; a QUOTED
 * pickup bounces back to PRICING_REVIEW on a Tier C / item edit.
 */
export interface SelfPickupEditPayload {
    collector_name?: string;
    collector_phone?: string;
    collector_email?: string | null;
    notes?: string | null;
    special_instructions?: string | null;
    is_permanent_placement?: boolean;
    po_number?: string | null;
    // Booking-window drivers (ISO strings). expected_return_at is clearable (null).
    pickup_window?: { start: string; end: string };
    expected_return_at?: string | null;
    // Item ops — same op model as orders (SP items have no maintenance):
    //   UPDATE (default): { order_item_id, quantity }
    //   ADD:              { op:"ADD", asset_id, quantity }
    //   REMOVE:           { op:"REMOVE", order_item_id } — last item rejected.
    items?: {
        op?: "UPDATE" | "ADD" | "REMOVE";
        order_item_id?: string;
        asset_id?: string;
        quantity?: number;
    }[];
}

export interface SelfPickupEditResponseData {
    changed_fields: { field: string; old: unknown; new: unknown }[];
    status: string;
    financial_status: string;
    status_reverted: boolean;
}

/**
 * Patch a self-pickup's details. `id` is the SP UUID (`pickup.id`). Prefix-
 * invalidates the detail key (which carries a trailing boolean scope element so
 * both owner + company-manager views refetch) plus the list query.
 */
export function useUpdateSelfPickupDetails(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body: SelfPickupEditPayload): Promise<SelfPickupEditResponseData> => {
            try {
                const response = await apiClient.patch(`/client/v1/self-pickup/${id}`, body);
                return response.data?.data as SelfPickupEditResponseData;
            } catch (error) {
                return throwApiError(error) as never;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickup", id] });
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
        },
    });
}

export function useCancelSelfPickup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await apiClient.post(`/client/v1/self-pickup/${id}/cancel`, {
                reason,
            });
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["client-self-pickups"] });
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}
