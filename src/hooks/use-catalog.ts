"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type {
    AssetUsageReportResponse,
    CatalogAssetDetailsResponse,
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
    assets: () => [...catalogKeys.all, "assets"] as const,
    asset: (id: string) => [...catalogKeys.assets(), id] as const,
    assetUsageReport: (id: string) => [...catalogKeys.assets(), id, "usage-report"] as const,
    collections: () => [...catalogKeys.all, "collections"] as const,
    collection: (id: string) => [...catalogKeys.collections(), id] as const,
};

type AssetImageShape = { url: string; note?: string; source?: "CLIENT" | "SCAN" };

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
            // Preserve the CLIENT|SCAN tag so condition/maintenance views can keep
            // scan/return imagery distinct from curated catalogue photos.
            const source =
                (image as any).source === "CLIENT" || (image as any).source === "SCAN"
                    ? ((image as any).source as "CLIENT" | "SCAN")
                    : undefined;
            normalized.push({ url, ...(note ? { note } : {}), ...(source ? { source } : {}) });
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

        const response = await apiClient.get(
            `/client/v1/catalog?${buildSearchParams({
                brand: params.brand,
                category_id: params.category,
                team_id: params.team,
                search_term: params.search_term,
                type: params.type === "asset" ? "asset" : params.type,
                limit: String(limit),
                page: String(requestedPage),
            })}`
        );

        const payload = response.data?.data || {};
        const meta = payload.meta || {};
        const rawItems = payload.items || [];

        const normalizeCategory = (raw: unknown) => {
            if (!raw)
                return {
                    label: null as string | null,
                    ref: null as null | { id: string; name: string; slug: string; color: string },
                };
            if (typeof raw === "string") return { label: raw, ref: null };
            if (typeof raw === "object" && raw !== null && "name" in raw) {
                const obj = raw as { id?: string; name?: string; slug?: string; color?: string };
                return {
                    label: typeof obj.name === "string" ? obj.name : null,
                    ref:
                        obj.id && obj.name && obj.slug && obj.color
                            ? { id: obj.id, name: obj.name, slug: obj.slug, color: obj.color }
                            : null,
                };
            }
            return { label: null, ref: null };
        };

        const mapAsset = (asset: any) => {
            const cat = normalizeCategory(asset.category);
            return {
                type: "asset" as const,
                id: asset.id,
                groupId: asset.group_id || null,
                groupName: asset.group_name || null,
                name: asset.name,
                description: asset.description,
                category: cat.label,
                categoryRef: cat.ref,
                images: normalizeAssetImageUrls(asset.images),
                onDisplayImage: asset.on_display_image || null,
                brand: asset.brand
                    ? {
                          id: asset.brand.id,
                          name: asset.brand.name,
                          logoUrl: null,
                      }
                    : null,
                team: asset.team?.id ? { id: asset.team.id, name: asset.team.name } : null,
                stockMode: asset.stock_mode,
                stockRecordCount: 1,
                totalQuantity: Number(asset.total_quantity || 0),
                availableQuantity: Number(asset.available_quantity || 0),
                statusSummary: {
                    available: asset.status === "AVAILABLE" ? 1 : 0,
                    booked: asset.status === "BOOKED" ? 1 : 0,
                    out: asset.status === "OUT" ? 1 : 0,
                    maintenance: asset.status === "MAINTENANCE" ? 1 : 0,
                    transformed: asset.status === "TRANSFORMED" ? 1 : 0,
                },
                conditionSummary: {
                    green: asset.condition === "GREEN" ? 1 : 0,
                    orange: asset.condition === "ORANGE" ? 1 : 0,
                    red: asset.condition === "RED" ? 1 : 0,
                },
                condition: asset.condition || "GREEN",
                conditionNotes: asset.condition_notes || null,
                refurbDaysEstimate: asset.refurb_days_estimate ?? null,
                volume: String(asset.volume_per_unit || 0),
                weight: String(asset.weight_per_unit || 0),
                dimensionLength: String(asset.dimensions?.length || 0),
                dimensionWidth: String(asset.dimensions?.width || 0),
                dimensionHeight: String(asset.dimensions?.height || 0),
                packaging: asset.packaging,
                code: asset.qr_code || null,
            };
        };

        const catalogItems = rawItems.map((item: any) => {
            if (item.type === "collection") {
                const cat = normalizeCategory(item.category);
                return {
                    type: "collection" as const,
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    category: cat.label,
                    categoryRef: cat.ref,
                    images: normalizeCollectionImageUrls(item.images),
                    brand: item.brand
                        ? {
                              id: item.brand.id,
                              name: item.brand.name,
                              logoUrl: item.brand.logo_url,
                          }
                        : null,
                    itemCount: Number(item.item_count || item.assets?.length || 0),
                };
            }

            if (item.type === "group") {
                const groupImageUrls = normalizeAssetImageUrls(item.group_images);
                const fallbackImageUrls = normalizeAssetImageUrls(item.images);
                const images = groupImageUrls.length > 0 ? groupImageUrls : fallbackImageUrls;
                const base = mapAsset({
                    ...item.siblings?.[0],
                    id: item.group_id,
                    name: item.group_name,
                    description: item.description,
                    images,
                    on_display_image: item.group_on_display_image || images[0] || null,
                    total_quantity: item.total_quantity,
                    available_quantity: item.available_quantity,
                    condition: item.condition_summary?.red
                        ? "RED"
                        : item.condition_summary?.orange
                          ? "ORANGE"
                          : "GREEN",
                    status: item.available_quantity > 0 ? "AVAILABLE" : "OUT",
                    stock_mode: item.stock_mode,
                });
                return {
                    ...base,
                    type: "group" as const,
                    id: item.group_id,
                    groupId: item.group_id,
                    groupName: item.group_name,
                    name: item.group_name,
                    images,
                    onDisplayImage: item.group_on_display_image || images[0] || null,
                    siblingCount: Number(item.sibling_count || item.siblings?.length || 0),
                    siblingThumbnails: normalizeAssetImageUrls(item.sibling_thumbnails),
                    siblings: (item.siblings || []).map((sibling: any) => ({
                        id: sibling.id,
                        groupId: sibling.group_id || null,
                        name: sibling.name,
                        description: sibling.description,
                        category: sibling.category || "",
                        images: normalizeAssetImages(sibling.images),
                        onDisplayImage: sibling.on_display_image || null,
                        brand: sibling.brand
                            ? { id: sibling.brand.id, name: sibling.brand.name, logoUrl: null }
                            : null,
                        availableQuantity: Number(sibling.available_quantity || 0),
                        totalQuantity: Number(sibling.total_quantity || 0),
                        condition: sibling.condition,
                        conditionNotes: sibling.condition_notes,
                        refurbDaysEstimate: sibling.refurb_days_estimate,
                        lastScannedAt: sibling.last_scanned_at,
                        volume: String(sibling.volume_per_unit || 0),
                        weight: String(sibling.weight_per_unit || 0),
                        dimensionLength: String(sibling.dimensions?.length || 0),
                        dimensionWidth: String(sibling.dimensions?.width || 0),
                        dimensionHeight: String(sibling.dimensions?.height || 0),
                        handlingTags: sibling.handling_tags || [],
                        trackingMethod: sibling.stock_mode,
                        qrCode: sibling.qr_code,
                    })),
                };
            }

            return mapAsset(item);
        });

        return {
            success: true,
            items: catalogItems,
            total: Number(meta.total ?? payload.total ?? catalogItems.length),
            totalFamilies: Number(
                meta.total_assets ??
                    payload.total_assets ??
                    (meta.total_grouped_assets || 0) + (meta.total_raw_assets || 0)
            ),
            totalCollections: Number(
                meta.total_collections ??
                    payload.total_collections ??
                    catalogItems.filter((item: any) => item.type === "collection").length
            ),
            limit: Number(meta.limit || limit),
            page: Number(meta.page || requestedPage),
            totalPages: Number(meta.total_pages || payload.total_pages || 1),
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
                groupId: asset.group_id || null,
                family: asset.group_id
                    ? {
                          id: asset.group_id,
                          name: asset.group_name || asset.name,
                          stockMode: asset.stock_mode,
                      }
                    : null,
                name: asset.name,
                description: asset.description,
                category: asset.category,
                images: normalizeAssetImages(asset.images),
                onDisplayImage: asset.on_display_image || null,
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
                trackingMethod: asset.stock_mode,
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

        const items = (raw.assets || []).map((item: any) => {
            const isArchived = Boolean(item.asset.deleted_at);
            return {
                id: item.asset.id,
                assetId: item.asset.id,
                family: item.asset.group_id
                    ? {
                          id: item.asset.group_id,
                          name: item.asset.group_name || item.asset.name,
                          stockMode: item.asset.stock_mode,
                      }
                    : null,
                name: item.asset.group_name || item.asset.name,
                category: item.asset.category,
                images: normalizeAssetImageUrls(item.asset.images),
                onDisplayImage: item.asset.on_display_image || null,
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
                // Archived assets are no longer orderable. The API still
                // returns them in the collection payload so admin can clean
                // up the membership; the client UI greys them out and blocks
                // add-to-cart. See item 5 of the 9-item bundle.
                isArchived,
                isAvailable: !isArchived && item.asset.available_quantity >= item.default_quantity,
            };
        });

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
