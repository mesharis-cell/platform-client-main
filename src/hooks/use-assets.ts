"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    Asset,
    AssetsListResponse,
    AssetWithDetails,
    CreateAssetRequest,
    UpdateAssetRequest,
} from "@/types/asset";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

// Query keys
export const assetKeys = {
    all: ["assets"] as const,
    lists: () => [...assetKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...assetKeys.lists(), params] as const,
    details: () => [...assetKeys.all, "detail"] as const,
    detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Fetch assets list
async function fetchAssets(params?: Record<string, string>): Promise<AssetsListResponse> {
    const searchParams = new URLSearchParams(params);
    try {
        const response = await apiClient.get(`/operations/v1/asset?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Fetch single asset
async function fetchAsset(id: string): Promise<{ asset: AssetWithDetails }> {
    try {
        const response = await apiClient.get(`/operations/v1/asset/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

type CreateAssetPayload = {
    company_id: string;
    brand_id?: string;
    warehouse_id: string;
    zone_id: string;
    name: string;
    description?: string;
    category: CreateAssetRequest["category"];
    images: string[];
    tracking_method: CreateAssetRequest["trackingMethod"];
    total_quantity: number;
    available_quantity?: number;
    packaging?: string;
    weight_per_unit: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    volume_per_unit: number;
    condition?: CreateAssetRequest["condition"];
    condition_notes?: string;
    handling_tags?: string[];
    refurb_days_estimate?: number;
    status?: CreateAssetRequest["status"];
};

const toCreateAssetPayload = (data: CreateAssetRequest): CreateAssetPayload => ({
    company_id: data.company,
    brand_id: data.brand,
    warehouse_id: data.warehouse,
    zone_id: data.zone,
    name: data.name,
    description: data.description,
    category: data.category,
    images: data.images,
    tracking_method: data.trackingMethod,
    total_quantity: data.totalQuantity,
    available_quantity: data.availableQuantity,
    packaging: data.packaging,
    weight_per_unit: data.weight,
    dimensions: {
        length: data.dimensionLength,
        width: data.dimensionWidth,
        height: data.dimensionHeight,
    },
    volume_per_unit: data.volume,
    condition: data.condition,
    condition_notes: data.conditionNotes,
    handling_tags: data.handlingTags,
    refurb_days_estimate: data.refurbDaysEstimate,
    status: data.status,
});

const toUpdateAssetPayload = (data: UpdateAssetRequest): Partial<CreateAssetPayload> => {
    const payload: Partial<CreateAssetPayload> = {};

    if (data.brand !== undefined) payload.brand_id = data.brand;
    if (data.warehouse !== undefined) payload.warehouse_id = data.warehouse;
    if (data.zone !== undefined) payload.zone_id = data.zone;
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description;
    if (data.category !== undefined) payload.category = data.category;
    if (data.images !== undefined) payload.images = data.images;
    if (data.totalQuantity !== undefined) payload.total_quantity = data.totalQuantity;
    if (data.packaging !== undefined) payload.packaging = data.packaging;
    if (data.weight !== undefined) payload.weight_per_unit = data.weight;
    if (data.volume !== undefined) payload.volume_per_unit = data.volume;
    if (data.condition !== undefined) payload.condition = data.condition;
    if (data.refurbDaysEstimate !== undefined)
        payload.refurb_days_estimate = data.refurbDaysEstimate;
    if (data.conditionNotes !== undefined) payload.condition_notes = data.conditionNotes;
    if (data.handlingTags !== undefined) payload.handling_tags = data.handlingTags;

    const dimensions: CreateAssetPayload["dimensions"] = {};
    if (data.dimensionLength !== undefined) dimensions.length = data.dimensionLength;
    if (data.dimensionWidth !== undefined) dimensions.width = data.dimensionWidth;
    if (data.dimensionHeight !== undefined) dimensions.height = data.dimensionHeight;
    if (Object.keys(dimensions).length > 0) payload.dimensions = dimensions;

    return payload;
};

// Create asset
async function createAsset(data: CreateAssetRequest): Promise<Asset> {
    const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreateAssetPayload(data)),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create asset");
    }
    return response.json();
}

// Update asset
async function updateAsset(id: string, data: UpdateAssetRequest): Promise<Asset> {
    const response = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toUpdateAssetPayload(data)),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update asset");
    }
    return response.json();
}

// Delete asset
async function deleteAsset(id: string): Promise<void> {
    const response = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete asset");
    }
}

// Upload image
async function uploadImage(
    formData: FormData
): Promise<{ data: { imageUrls: string[]; presignedUrl: string } }> {
    try {
        const response = await apiClient.post("/operations/v1/upload/images", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Generate QR code
async function generateQRCode(qrCode: string): Promise<{ qrCodeImage: string }> {
    const response = await fetch("/api/assets/qr-code/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode }),
    });
    if (!response.ok) {
        throw new Error("Failed to generate QR code");
    }
    return response.json();
}

// Hooks
export function useAssets(params?: Record<string, string>) {
    return useQuery({
        queryKey: assetKeys.list(params),
        queryFn: () => fetchAssets(params),
    });
}

// Search assets hook with enabled control for debounced searching
export function useSearchAssets(searchTerm: string, companyId?: string) {
    const params: Record<string, string> = {};
    if (searchTerm) params.search_term = searchTerm;
    if (companyId) params.company_id = companyId;

    return useQuery({
        queryKey: [...assetKeys.lists(), "search", searchTerm, companyId] as const,
        queryFn: () => fetchAssets(params),
        enabled: !!searchTerm && searchTerm.length >= 2 && !!companyId,
        staleTime: 30000, // Cache for 30 seconds
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: assetKeys.detail(id),
        queryFn: () => fetchAsset(id),
        enabled: !!id,
    });
}

export function useCreateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        },
    });
}

export function useUploadImage() {
    return useMutation({
        mutationFn: uploadImage,
    });
}

export function useGenerateQRCode() {
    return useMutation({
        mutationFn: generateQRCode,
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateAssetRequest }) =>
            updateAsset(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
        },
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        },
    });
}
