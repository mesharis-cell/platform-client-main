// Phase 4: Collections & Catalog System TypeScript Types

import type { Condition, AssetStatus, HandlingTag, AssetCategory, AssetImage } from "./asset";

// ========================================
// Collection Types
// ========================================

export interface Collection {
    id: string;
    company: string;
    brand: string | null;
    team?: { id: string; name: string } | null;
    name: string;
    description: string | null;
    images: string[];
    category: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface CollectionWithDetails extends Collection {
    companyName?: string;
    brandName?: string;
    brandLogoUrl?: string | null;
    itemCount: number;
}

export interface CollectionItem {
    id: string;
    collection: string;
    asset: string;
    defaultQuantity: number;
    notes: string | null;
    createdAt: Date;
}

export interface CollectionItemWithAsset extends CollectionItem {
    assetDetails: {
        id: string;
        name: string;
        category: string;
        images: string[];
        volume: string; // decimal as string
        weight: string; // decimal as string
        status: AssetStatus;
        condition: Condition;
        availableQuantity: number;
        totalQuantity: number;
        handlingTags: HandlingTag[];
    };
}

// ========================================
// Collection Request/Response Types
// ========================================

export interface CreateCollectionRequest {
    company: string;
    brand: string;
    team_id: string | null;
    name: string;
    description?: string | null;
    category?: string | null;
    images?: string[];
}

export interface UpdateCollectionRequest {
    name?: string;
    description?: string | null;
    category?: string | null;
    images?: string[];
    brand?: string;
    team_id?: string | null;
}

export interface CollectionListParams {
    company?: string;
    brand?: string;
    category?: string;
    search?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
}

export interface CollectionListResponse {
    success: boolean;
    collections: CollectionWithDetails[];
    total: number;
    limit: number;
    offset: number;
}

export interface CollectionDetailsResponse {
    success: boolean;
    collection: CollectionWithDetails & {
        items: CollectionItemWithAsset[];
    };
}

// ========================================
// Collection Item Request/Response Types
// ========================================

export interface AddCollectionItemRequest {
    asset: string;
    defaultQuantity: number;
    notes?: string | null;
}

export interface UpdateCollectionItemRequest {
    defaultQuantity?: number;
    notes?: string | null;
}

// ========================================
// Collection Availability Types
// ========================================

export interface CollectionAvailabilityItem {
    assetId: string;
    assetName: string;
    defaultQuantity: number;
    availableQuantity: number;
    isAvailable: boolean;
}

export interface CollectionAvailabilityResponse {
    success: boolean;
    collectionId: string;
    isFullyAvailable: boolean;
    items: CollectionAvailabilityItem[];
}

// ========================================
// Catalog Types
// ========================================

export interface CatalogAssetItem {
    type: "asset";
    id: string;
    name: string;
    status: AssetStatus;
    description: string | null;
    category: string;
    images: string[];
    brand: {
        id: string;
        name: string;
        logoUrl?: string | null;
    } | null;
    availableQuantity: number;
    totalQuantity: number;
    condition: Condition;
    condition_notes?: string | null;
    refurbDaysEstimate?: number | null; // Feedback #2: Days needed for refurbishment
    lastScannedAt?: string | null;
    volume: string; // decimal as string
    weight: string; // decimal as string
    dimensionLength: string; // decimal as string (cm)
    dimensionWidth: string; // decimal as string (cm)
    dimensionHeight: string; // decimal as string (cm)
    tracking_method: string;
}

export interface CatalogCollectionItem {
    type: "collection";
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    images: string[];
    brand: {
        id: string;
        name: string;
        logoUrl?: string | null;
    } | null;
    itemCount: number;
}

export type CatalogItem = CatalogAssetItem | CatalogCollectionItem;

export interface CatalogListParams {
    company?: string;
    brand?: string;
    category?: string;
    search_term?: string;
    type?: "asset" | "collection" | "all";
    limit?: number;
    offset?: number;
}

export interface CatalogListResponse {
    success: boolean;
    items: CatalogItem[];
    total: number;
    limit: number;
    offset: number;
}

// ========================================
// Catalog Detail Types
// ========================================

export interface CatalogAssetDetails {
    id: string;
    name: string;
    description: string | null;
    category: string;
    images: AssetImage[];
    brand: {
        id: string;
        name: string;
        logoUrl: string | null;
    } | null;
    company?: {
        id: string;
        name: string;
        brands?: Array<{ id: string; name: string }>;
    };
    availableQuantity: number;
    totalQuantity: number;
    condition: Condition;
    conditionNotes?: string | null;
    refurbDaysEstimate?: number | null; // Feedback #2: Days needed for refurbishment
    lastScannedAt?: string | null;
    volume: string; // decimal as string
    weight: string; // decimal as string
    dimensionLength: string; // decimal as string
    dimensionWidth: string; // decimal as string
    dimensionHeight: string; // decimal as string
    handlingTags: HandlingTag[];
}

export interface CatalogCollectionItemDetail {
    id: string;
    name: string;
    category: string;
    images: string[];
    defaultQuantity: number;
    availableQuantity: number;
    totalQuantity: number;
    condition: Condition;
    refurbDaysEstimate?: number | null; // Feedback #2: Days needed for refurbishment
    volume: string; // decimal as string
    weight: string; // decimal as string
    dimensionLength: string; // decimal as string (cm)
    dimensionWidth: string; // decimal as string (cm)
    dimensionHeight: string; // decimal as string (cm)
    isAvailable: boolean; // availableQuantity >= defaultQuantity
}

export interface CatalogCollectionDetails {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    images: string[];
    brand: {
        id: string;
        name: string;
        logoUrl: string | null;
    } | null;
    items: CatalogCollectionItemDetail[];
    totalVolume: string; // decimal as string (sum of items)
    totalWeight: string; // decimal as string (sum of items)
    isFullyAvailable: boolean; // all items available
}

export interface CatalogAssetDetailsResponse {
    success: boolean;
    asset: CatalogAssetDetails;
}

export interface CatalogCollectionDetailsResponse {
    success: boolean;
    data: CatalogCollectionDetails;
}

export type AssetUsageEventType =
    | "ORDER_USAGE"
    | "SCAN_EVENT"
    | "SERVICE_REQUEST"
    | "CONDITION_UPDATE";

export interface AssetUsageMediaItem {
    url: string;
    note?: string | null;
    kind?: string | null;
}

export interface AssetUsageTimelineEntry {
    id: string;
    event_type: AssetUsageEventType;
    occurred_at: string;
    title: string;
    subtitle?: string | null;
    note?: string | null;
    actor_name?: string | null;
    condition?: Condition | null;
    scan_type?: string | null;
    order_id?: string | null;
    order_readable_id?: string | null;
    service_request_id?: string | null;
    photos: AssetUsageMediaItem[];
}

export interface AssetUsageReport {
    asset: {
        id: string;
        name: string;
        company_id: string;
        company_name: string | null;
        condition: Condition;
        status: string;
        available_quantity: number;
        total_quantity: number;
        last_scanned_at: string | null;
        condition_notes: string | null;
        refurb_days_estimate: number | null;
    };
    summary: {
        total_order_usages: number;
        total_scan_events: number;
        total_service_requests: number;
        total_condition_updates: number;
        latest_activity_at: string | null;
    };
    timeline: AssetUsageTimelineEntry[];
}

export interface AssetUsageReportResponse {
    success: boolean;
    data: AssetUsageReport;
}
