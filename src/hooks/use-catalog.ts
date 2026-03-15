"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type {
    AssetUsageReportResponse,
    CatalogAssetDetailsResponse,
    CatalogAssetFamilyDetailsResponse,
    CatalogCollectionDetailsResponse,
    CatalogListParams,
    CatalogListResponse,
} from "@/types/collection";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const catalogKeys = {
    all: ["catalog"] as const,
    lists: () => [...catalogKeys.all, "list"] as const,
    list: (params?: CatalogListParams) => [...catalogKeys.lists(), params] as const,
    details: () => [...catalogKeys.all, "detail"] as const,
    families: () => [...catalogKeys.all, "families"] as const,
    family: (id: string) => [...catalogKeys.families(), id] as const,
    assets: () => [...catalogKeys.all, "assets"] as const,
    asset: (id: string) => [...catalogKeys.assets(), id] as const,
    assetUsageReport: (id: string) => [...catalogKeys.assets(), id, "usage-report"] as const,
    collections: () => [...catalogKeys.all, "collections"] as const,
    collection: (id: string) => [...catalogKeys.collections(), id] as const,
};

type AssetImageShape = { url: string; note?: string };

const normalizeCollectionImageUrls = (images: unknown): string[] => {
    if (!Array.isArray(images)) return [];
    return images
        .map((image) => (typeof image === "string" ? image : null))
        .filter((url): url is string => Boolean(url));
};

const normalizeAssetImages = (images: unknown): AssetImageShape[] => {
    if (!Array.isArray(images)) return [];
    const normalized: AssetImageShape[] = [];
    for (const image of images) {
        if (image && typeof image === "object" && typeof (image as any).url === "string") {
            const url = (image as any).url as string;
            const note =
                typeof (image as any).note === "string"
                    ? ((image as any).note as string)
                    : undefined;
            normalized.push(note ? { url, note } : { url });
        } else if (typeof image === "string") {
            normalized.push({ url: image });
        }
    }
    return normalized;
};

const normalizeAssetImageUrls = (images: unknown): string[] =>
    normalizeAssetImages(images).map((image) => image.url);

const buildSearchParams = (params: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "_all_" || value === "all") return;
        searchParams.set(key, String(value));
    });
    return searchParams;
};

async function fetchCatalog(params: CatalogListParams = {}): Promise<CatalogListResponse> {
    try {
        const requestedPage = params.page || 1;
        const limit = params.limit || 24;

        const familyQuery: Record<string, string | undefined> = {
            brand: params.brand,
            category: params.category,
            search_term: params.search_term,
            limit: String(limit),
            page: String(requestedPage),
        };

        const shouldFetchFamilies = params.type !== "collection";
        const shouldFetchCollections = params.type !== "family";

        const [familyResponse, collectionResponse] = await Promise.all([
            shouldFetchFamilies
                ? apiClient.get(`/operations/v1/asset-family?${buildSearchParams(familyQuery)}`)
                : Promise.resolve(null),
            shouldFetchCollections
                ? apiClient.get(
                      `/client/v1/catalog?${buildSearchParams({
                          brand: params.brand,
                          category: params.category,
                          search_term: params.search_term,
                          type: "collection",
                      })}`
                  )
                : Promise.resolve(null),
        ]);

        const families = familyResponse?.data?.data || [];
        const familyMeta = familyResponse?.data?.meta || { total: 0, page: 1, limit };
        const collections = collectionResponse?.data?.data?.collections || [];

        const familyItems = families.map((family: any) => ({
            type: "family" as const,
            id: family.id,
            name: family.name,
            description: family.description,
            category: family.category,
            images: normalizeAssetImageUrls(family.images),
            brand: family.brand
                ? {
                      id: family.brand.id,
                      name: family.brand.name,
                      logoUrl: null,
                  }
                : null,
            stockMode: family.stock_mode,
            stockRecordCount: Number(family.stock_record_count || family.asset_count || 0),
            totalQuantity: Number(family.total_quantity || 0),
            availableQuantity: Number(family.available_quantity || 0),
            statusSummary: {
                available: Number(family.status_summary?.available || 0),
                booked: Number(family.status_summary?.booked || 0),
                out: Number(family.status_summary?.out || 0),
                maintenance: Number(family.status_summary?.maintenance || 0),
                transformed: Number(family.status_summary?.transformed || 0),
            },
            conditionSummary: {
                green: Number(family.condition_summary?.green || 0),
                orange: Number(family.condition_summary?.orange || 0),
                red: Number(family.condition_summary?.red || 0),
            },
            volume: String(family.volume_per_unit || 0),
            weight: String(family.weight_per_unit || 0),
            dimensionLength: String(family.dimensions?.length || 0),
            dimensionWidth: String(family.dimensions?.width || 0),
            dimensionHeight: String(family.dimensions?.height || 0),
            packaging: family.packaging,
        }));

        const collectionItems = collections.map((collection: any) => ({
            type: "collection" as const,
            id: collection.id,
            name: collection.name,
            description: collection.description,
            category: collection.category,
            images: normalizeCollectionImageUrls(collection.images),
            brand: collection.brand
                ? {
                      id: collection.brand.id,
                      name: collection.brand.name,
                      logoUrl: collection.brand.logo_url,
                  }
                : null,
            itemCount: Number(collection.assets?.length || 0),
        }));

        // Families are server-paginated; collections are fetched in full (typically small count)
        const items =
            params.type === "family"
                ? familyItems
                : params.type === "collection"
                  ? collectionItems
                  : [...familyItems, ...collectionItems];

        const totalItems =
            params.type === "collection"
                ? collectionItems.length
                : Number(familyMeta.total) + (params.type === "all" ? collectionItems.length : 0);

        return {
            success: true,
            items,
            total: totalItems,
            totalFamilies: Number(familyMeta.total),
            totalCollections: collectionItems.length,
            limit,
            page: requestedPage,
            totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        };
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchCatalogFamily(id: string): Promise<CatalogAssetFamilyDetailsResponse> {
    try {
        const [familyResponse, stockResponse] = await Promise.all([
            apiClient.get(`/operations/v1/asset-family/${id}`),
            apiClient.get(`/operations/v1/asset?family_id=${id}`),
        ]);

        const family = familyResponse.data.data;
        const stockRecords = (stockResponse.data?.data || []).map((asset: any) => ({
            id: asset.id,
            familyId: asset.family_id || null,
            name: asset.name,
            description: asset.description,
            category: asset.category,
            images: normalizeAssetImages(asset.images),
            availableQuantity: Number(asset.available_quantity || 0),
            totalQuantity: Number(asset.total_quantity || 0),
            condition: asset.condition,
            conditionNotes: asset.condition_notes,
            refurbDaysEstimate: asset.refurb_days_estimate,
            lastScannedAt: asset.last_scanned_at,
            volume: String(asset.volume_per_unit || 0),
            weight: String(asset.weight_per_unit || 0),
            dimensionLength: String(asset.dimensions?.length || 0),
            dimensionWidth: String(asset.dimensions?.width || 0),
            dimensionHeight: String(asset.dimensions?.height || 0),
            handlingTags: asset.handling_tags || [],
            trackingMethod: asset.tracking_method,
            status: asset.status,
            qrCode: asset.qr_code,
        }));

        return {
            success: true,
            family: {
                id: family.id,
                name: family.name,
                description: family.description,
                category: family.category,
                images: normalizeAssetImages(family.images),
                brand: family.brand
                    ? {
                          id: family.brand.id,
                          name: family.brand.name,
                      }
                    : null,
                company: family.company
                    ? {
                          id: family.company.id,
                          name: family.company.name,
                      }
                    : null,
                stockMode: family.stock_mode,
                packaging: family.packaging,
                volume: String(family.volume_per_unit || 0),
                weight: String(family.weight_per_unit || 0),
                dimensionLength: String(family.dimensions?.length || 0),
                dimensionWidth: String(family.dimensions?.width || 0),
                dimensionHeight: String(family.dimensions?.height || 0),
                availableQuantity: Number(family.available_quantity || 0),
                totalQuantity: Number(family.total_quantity || 0),
                stockRecordCount: Number(family.stock_record_count || family.asset_count || 0),
                statusSummary: {
                    available: Number(family.status_summary?.available || 0),
                    booked: Number(family.status_summary?.booked || 0),
                    out: Number(family.status_summary?.out || 0),
                    maintenance: Number(family.status_summary?.maintenance || 0),
                    transformed: Number(family.status_summary?.transformed || 0),
                },
                conditionSummary: {
                    green: Number(family.condition_summary?.green || 0),
                    orange: Number(family.condition_summary?.orange || 0),
                    red: Number(family.condition_summary?.red || 0),
                },
                handlingTags: family.handling_tags || [],
                stockRecords,
            },
        };
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchCatalogAsset(id: string): Promise<CatalogAssetDetailsResponse> {
    try {
        const response = await apiClient.get(`/operations/v1/asset/${id}`);
        const asset = response.data.data;

        return {
            success: true,
            asset: {
                id: asset.id,
                familyId: asset.family_id || null,
                family: asset.family
                    ? {
                          id: asset.family.id,
                          name: asset.family.name,
                          stockMode: asset.family.stock_mode,
                      }
                    : null,
                name: asset.name,
                description: asset.description,
                category: asset.category,
                images: normalizeAssetImages(asset.images),
                brand: asset.brand_details || null,
                company: asset.company_details || null,
                availableQuantity: asset.available_quantity,
                totalQuantity: asset.total_quantity,
                condition: asset.condition,
                conditionNotes: asset.condition_notes,
                refurbDaysEstimate: asset.refurb_days_estimate,
                lastScannedAt: asset.last_scanned_at,
                volume: String(asset.volume_per_unit || 0),
                weight: String(asset.weight_per_unit || 0),
                dimensionLength: String(asset.dimensions?.length || 0),
                dimensionWidth: String(asset.dimensions?.width || 0),
                dimensionHeight: String(asset.dimensions?.height || 0),
                handlingTags: asset.handling_tags || [],
                trackingMethod: asset.tracking_method,
                qrCode: asset.qr_code,
            },
        };
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchAssetUsageReport(id: string): Promise<AssetUsageReportResponse> {
    try {
        const response = await apiClient.get(`/operations/v1/asset/${id}/usage-report`);
        return {
            success: true,
            data: response.data.data,
        };
    } catch (error) {
        throwApiError(error);
    }
}

async function fetchCatalogCollection(id: string): Promise<CatalogCollectionDetailsResponse> {
    try {
        const response = await apiClient.get(`/operations/v1/collection/${id}`);
        const raw = response.data.data;

        const items = (raw.assets || []).map((item: any) => ({
            id: item.asset.id,
            assetId: item.asset.id,
            family: item.asset.family
                ? {
                      id: item.asset.family.id,
                      name: item.asset.family.name,
                      stockMode: item.asset.family.stock_mode,
                  }
                : null,
            name: item.asset.family?.name || item.asset.name,
            category: item.asset.category,
            images: normalizeAssetImageUrls(item.asset.images),
            defaultQuantity: item.default_quantity,
            availableQuantity: item.asset.available_quantity,
            totalQuantity: item.asset.total_quantity,
            condition: item.asset.condition,
            refurbDaysEstimate: item.asset.refurb_days_estimate || null,
            volume: String(item.asset.volume_per_unit || 0),
            weight: String(item.asset.weight_per_unit || 0),
            dimensionLength: String(item.asset.dimensions?.length || 0),
            dimensionWidth: String(item.asset.dimensions?.width || 0),
            dimensionHeight: String(item.asset.dimensions?.height || 0),
            isAvailable: item.asset.available_quantity >= item.default_quantity,
        }));

        const totalVolume = items.reduce((sum: number, item: any) => sum + Number(item.volume), 0);
        const totalWeight = items.reduce((sum: number, item: any) => sum + Number(item.weight), 0);
        const isFullyAvailable = items.every((item: any) => item.isAvailable);

        return {
            success: true,
            data: {
                id: raw.id,
                name: raw.name,
                description: raw.description || null,
                category: raw.category || null,
                images: normalizeCollectionImageUrls(raw.images),
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

export function useCatalog(params: CatalogListParams = {}) {
    return useQuery({
        queryKey: catalogKeys.list(params),
        queryFn: () => fetchCatalog(params),
        staleTime: 30000,
    });
}

export function useCatalogFamily(id: string | undefined) {
    return useQuery({
        queryKey: catalogKeys.family(id || ""),
        queryFn: () => fetchCatalogFamily(id!),
        enabled: !!id,
        staleTime: 30000,
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

export function useAssetVersions(assetId: string | null) {
    return useQuery({
        queryKey: ["asset-versions", assetId],
        queryFn: async () => {
            if (!assetId) return [];
            const res = await apiClient.get(`/operations/v1/asset/${assetId}/versions`);
            return res.data?.data || [];
        },
        enabled: !!assetId,
    });
}

export function useAssetConditionHistory(assetId: string | null) {
    return useQuery({
        queryKey: ["asset-condition-history", assetId],
        queryFn: async () => {
            if (!assetId) return [];
            const res = await apiClient.get(`/operations/v1/asset/${assetId}`);
            return res.data?.data?.condition_history || [];
        },
        enabled: !!assetId,
    });
}

export function useAssetUsageReport(assetId: string | null) {
    return useQuery({
        queryKey: catalogKeys.assetUsageReport(assetId || ""),
        queryFn: async () => {
            if (!assetId) return null;
            const res = await fetchAssetUsageReport(assetId);
            return res.data;
        },
        enabled: !!assetId,
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
