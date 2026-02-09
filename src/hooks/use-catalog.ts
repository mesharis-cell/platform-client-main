"use client";

// Phase 4: Catalog React Query Hooks

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type {
    CatalogListParams,
    CatalogListResponse,
    CatalogAssetDetailsResponse,
    CatalogCollectionDetailsResponse,
} from "@/types/collection";
import { throwApiError } from "@/lib/utils/throw-api-error";

// ========================================
// Query Keys
// ========================================

export const catalogKeys = {
    all: ["catalog"] as const,
    lists: () => [...catalogKeys.all, "list"] as const,
    list: (params?: CatalogListParams) => [...catalogKeys.lists(), params] as const,
    details: () => [...catalogKeys.all, "detail"] as const,
    assets: () => [...catalogKeys.all, "assets"] as const,
    asset: (id: string) => [...catalogKeys.assets(), id] as const,
    collections: () => [...catalogKeys.all, "collections"] as const,
    collection: (id: string) => [...catalogKeys.collections(), id] as const,
};

// ========================================
// Fetch Functions
// ========================================

async function fetchCatalog(params: CatalogListParams = {}): Promise<CatalogListResponse> {
    const searchParams = new URLSearchParams();

    if (params.company) searchParams.set("company", params.company);
    if (params.brand) searchParams.set("brand", params.brand);
    if (params.category) searchParams.set("category", params.category);
    if (params.search_term) searchParams.set("search_term", params.search_term);
    if (params.type) searchParams.set("type", params.type);
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.offset) searchParams.set("offset", params.offset.toString());

    const response = await apiClient.get(`/client/v1/catalog?${searchParams.toString()}`);

    // Transform the response to match the UI expectation
    const assets = response.data.data.assets || [];
    const collections = response.data.data.collections || [];

    const items = [
        ...assets.map((asset: any) => ({
            type: "asset" as const,
            id: asset.id,
            name: asset.name,
            status: asset.status,
            description: asset.description,
            category: asset.category,
            images: asset.images || [],
            brand: asset.brand
                ? {
                      id: asset.brand.id,
                      name: asset.brand.name,
                      logoUrl: asset.brand.logo_url,
                  }
                : null,
            availableQuantity: asset.available_quantity,
            totalQuantity: asset.total_quantity,
            condition: asset.condition,
            refurbDaysEstimate: asset.refurb_days_estimate,
            volume: asset.volume_per_unit,
            weight: asset.weight_per_unit,
            dimensionLength: asset.dimensions?.length,
            dimensionWidth: asset.dimensions?.width,
            dimensionHeight: asset.dimensions?.height,
            tracking_method: asset.tracking_method,
        })),
        ...collections.map((collection: any) => ({
            type: "collection" as const,
            id: collection.id,
            name: collection.name,
            description: collection.description,
            category: collection.category,
            images: collection.images || [],
            brand: collection.brand
                ? {
                      id: collection.brand.id,
                      name: collection.brand.name,
                      logoUrl: collection.brand.logo_url,
                  }
                : null,
            itemCount: response.data.data.meta?.total_collections || 0,
        })),
    ];

    return {
        success: true,
        items: items,
        total:
            (response.data.data.meta?.total_assets || 0) +
            (response.data.data.meta?.total_collections || 0),
        limit: response.data.data.meta?.limit || 100,
        offset: response.data.data.meta?.page || 0,
    };
}

async function fetchCatalogAsset(id: string): Promise<CatalogAssetDetailsResponse> {
    try {
        const response = await apiClient.get<CatalogAssetDetailsResponse>(
            `/client/v1/catalog/assets/${id}`
        );
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchCatalogCollection(id: string): Promise<CatalogCollectionDetailsResponse> {
    try {
        const response = await apiClient.get(`/operations/v1/collection/${id}`);
        const raw = response.data.data;

        // Transform backend response to match CatalogCollectionDetails type
        const items = (raw.assets || []).map((item: any) => ({
            id: item.asset.id,
            name: item.asset.name,
            category: item.asset.category,
            images: item.asset.images || [],
            defaultQuantity: item.default_quantity,
            availableQuantity: item.asset.available_quantity,
            totalQuantity: item.asset.total_quantity,
            condition: item.asset.condition,
            refurbDaysEstimate: item.asset.refurb_days_estimate || null,
            volume: item.asset.volume_per_unit,
            weight: item.asset.weight_per_unit,
            dimensionLength: String(item.asset.dimensions?.length || 0),
            dimensionWidth: String(item.asset.dimensions?.width || 0),
            dimensionHeight: String(item.asset.dimensions?.height || 0),
            isAvailable: item.asset.available_quantity >= item.default_quantity,
        }));

        // Calculate totals
        const totalVolume = items.reduce(
            (sum: number, item: any) => sum + Number(item.volume || 0),
            0
        );
        const totalWeight = items.reduce(
            (sum: number, item: any) => sum + Number(item.weight || 0),
            0
        );
        const isFullyAvailable = items.every((item: any) => item.isAvailable);

        return {
            success: true,
            data: {
                id: raw.id,
                name: raw.name,
                description: raw.description || null,
                category: raw.category || null,
                images: raw.images || [],
                brand: raw.brand
                    ? {
                          id: raw.brand.id,
                          name: raw.brand.name,
                          logoUrl: raw.brand.logo_url || null,
                      }
                    : null,
                items,
                totalVolume: String(totalVolume),
                totalWeight: String(totalWeight),
                isFullyAvailable,
            },
        };
    } catch (error) {
        throwApiError(error);
    }
}

// ========================================
// Catalog Query Hooks
// ========================================

export function useCatalog(params: CatalogListParams = {}) {
    return useQuery({
        queryKey: catalogKeys.list(params),
        queryFn: () => fetchCatalog(params),
        staleTime: 30000, // 30 seconds
    });
}

export function useCatalogAsset(id: string | undefined) {
    return useQuery({
        queryKey: catalogKeys.asset(id || ""),
        queryFn: () => fetchCatalogAsset(id!),
        enabled: !!id,
        staleTime: 30000,
    });
}

export function useCatalogCollection(id: string | undefined) {
    return useQuery({
        queryKey: catalogKeys.collection(id || ""),
        queryFn: () => fetchCatalogCollection(id!),
        enabled: !!id,
        staleTime: 30000,
    });
}
