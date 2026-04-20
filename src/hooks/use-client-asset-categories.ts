"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type ClientAssetCategory = {
    id: string;
    name: string;
    slug: string;
    color: string;
};

export function useClientAssetCategories() {
    return useQuery({
        queryKey: ["client-asset-categories"],
        queryFn: async (): Promise<ClientAssetCategory[]> => {
            const response = await apiClient.get(
                "/client/v1/asset-category?limit=1000"
            );
            const raw = response.data?.data ?? [];
            return (Array.isArray(raw) ? raw : []).map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                color: cat.color || "#888888",
            }));
        },
        staleTime: 5 * 60 * 1000,
    });
}
