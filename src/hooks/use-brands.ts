"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Brand, BrandListResponse, CreateBrandRequest, UpdateBrandRequest } from "@/types";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// Query keys
export const brandKeys = {
    all: ["brands"] as const,
    lists: () => [...brandKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...brandKeys.lists(), params] as const,
    details: () => [...brandKeys.all, "detail"] as const,
    detail: (id: string) => [...brandKeys.details(), id] as const,
};

// Fetch brands list
async function fetchBrands(params?: Record<string, string>): Promise<BrandListResponse> {
    try {
        const searchParams = new URLSearchParams(params);
        const response = await apiClient.get(`/operations/v1/brand?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Create brand
async function createBrand(data: CreateBrandRequest): Promise<Brand> {
    try {
        const response = await apiClient.post("/operations/v1/brand", data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Update brand
async function updateBrand({ id, data }: { id: string; data: UpdateBrandRequest }): Promise<Brand> {
    try {
        const response = await apiClient.patch(`/operations/v1/brand/${id}`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Delete brand
async function deleteBrand(id: string): Promise<void> {
    try {
        const response = await apiClient.delete(`/operations/v1/brand/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Hooks
export function useBrands(params?: Record<string, string>) {
    // If caller is filtering by company_id (the client portal always does),
    // don't fire the query until that value is populated — `company_id=undefined`
    // serialises as the literal string "undefined" and the API rejects it with
    // a 500 (Drizzle SQL error on the join). This is a user-context race that
    // used to spam every catalog page load with a red console entry.
    const hasUndefinedFilter = params && "company_id" in params && !params.company_id;
    return useQuery({
        queryKey: brandKeys.list(params),
        queryFn: () => fetchBrands(params),
        enabled: !hasUndefinedFilter,
    });
}

export function useCreateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
        },
    });
}

export function useUpdateBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: brandKeys.lists() });
        },
    });
}
