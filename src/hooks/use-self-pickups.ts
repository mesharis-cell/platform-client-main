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

export function useClientSelfPickupDetail(id: string | null) {
    return useQuery({
        queryKey: selfPickupKeys.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/client/v1/self-pickup/${id}`);
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
