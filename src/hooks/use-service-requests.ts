"use client";

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    CreateServiceRequestInput,
    ListServiceRequestsParams,
    ServiceRequestDetailsResponse,
    ServiceRequestListResponse,
} from "@/types/service-request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const serviceRequestKeys = {
    all: () => ["client-service-requests"] as const,
    lists: () => ["client-service-requests", "list"] as const,
    list: (filters: ListServiceRequestsParams) =>
        ["client-service-requests", "list", filters] as const,
    detail: (id: string) => ["client-service-requests", "detail", id] as const,
};

function buildQueryString(params: ListServiceRequestsParams) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search_term) queryParams.append("search_term", params.search_term);
    if (params.request_status) queryParams.append("request_status", params.request_status);
    if (params.request_type) queryParams.append("request_type", params.request_type);
    if (params.billing_mode) queryParams.append("billing_mode", params.billing_mode);
    return queryParams.toString();
}

export function useClientServiceRequests(filters: ListServiceRequestsParams = {}) {
    return useQuery({
        queryKey: serviceRequestKeys.list(filters),
        queryFn: async (): Promise<ServiceRequestListResponse> => {
            try {
                const query = buildQueryString(filters);
                const response = await apiClient.get(`/client/v1/service-request?${query}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}

export function useClientServiceRequestDetails(id: string | null) {
    return useQuery({
        queryKey: id ? serviceRequestKeys.detail(id) : ["client-service-requests", "none"],
        queryFn: async (): Promise<ServiceRequestDetailsResponse> => {
            if (!id) return Promise.reject("No service request ID");
            try {
                const response = await apiClient.get(`/client/v1/service-request/${id}`);
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        enabled: !!id,
    });
}

export function useCreateServiceRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateServiceRequestInput) => {
            try {
                const response = await apiClient.post("/client/v1/service-request", {
                    ...payload,
                    billing_mode: "CLIENT_BILLABLE",
                });
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ["client-dashboard-summary"] });
        },
    });
}

export function useApproveServiceRequestQuote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, note }: { id: string; note?: string }) => {
            try {
                const response = await apiClient.post(
                    `/client/v1/service-request/${id}/approve-quote`,
                    {
                        note,
                    }
                );
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ["client-orders"] });
            queryClient.invalidateQueries({ queryKey: ["client-dashboard-summary"] });
        },
    });
}
