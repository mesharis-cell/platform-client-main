import type {
    Condition,
    AssetStatus,
    HandlingTag,
    AssetCategory,
    AssetImage,
    TrackingMethod,
} from "./asset";
import type { AssetFamilyConditionSummary, AssetFamilySummary, StockMode } from "./asset-family";

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
        volume: string;
        weight: string;
        status: AssetStatus;
        condition: Condition;
        availableQuantity: number;
        totalQuantity: number;
        handlingTags: HandlingTag[];
    };
}

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

export interface AddCollectionItemRequest {
    asset: string;
    defaultQuantity: number;
    notes?: string | null;
}

export interface UpdateCollectionItemRequest {
    defaultQuantity?: number;
    notes?: string | null;
}

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

export interface CatalogAssetFamilyItem {
    type: "family";
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    categoryRef: {
        id: string;
        name: string;
        slug: string;
        color: string;
    } | null;
    images: string[];
    brand: {
        id: string;
        name: string;
        logoUrl?: string | null;
    } | null;
    stockMode: StockMode;
    stockRecordCount: number;
    totalQuantity: number;
    availableQuantity: number;
    statusSummary: AssetFamilySummary;
    conditionSummary: AssetFamilyConditionSummary;
    volume: string;
    weight: string;
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
    packaging?: string | null;
}

export interface CatalogCollectionItem {
    type: "collection";
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    categoryRef: null;
    images: string[];
    brand: {
        id: string;
        name: string;
        logoUrl?: string | null;
    } | null;
    itemCount: number;
}

export type CatalogItem = CatalogAssetFamilyItem | CatalogCollectionItem;

export interface CatalogListParams {
    company?: string;
    brand?: string;
    category?: string;
    team?: string;
    search_term?: string;
    type?: "family" | "collection" | "all";
    limit?: number;
    page?: number;
}

export interface CatalogListResponse {
    success: boolean;
    items: CatalogItem[];
    total: number;
    totalFamilies: number;
    totalCollections: number;
    limit: number;
    page: number;
    totalPages: number;
}

export interface CatalogAssetDetails {
    id: string;
    familyId?: string | null;
    family?: {
        id: string;
        name: string;
        stockMode: StockMode;
    } | null;
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
    refurbDaysEstimate?: number | null;
    lastScannedAt?: string | null;
    volume: string;
    weight: string;
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
    handlingTags: HandlingTag[];
    trackingMethod?: TrackingMethod;
    qrCode?: string | null;
}

export interface CatalogFamilyStockItem {
    id: string;
    familyId: string | null;
    name: string;
    description: string | null;
    category: string;
    images: AssetImage[];
    availableQuantity: number;
    totalQuantity: number;
    condition: Condition;
    conditionNotes?: string | null;
    refurbDaysEstimate?: number | null;
    lastScannedAt?: string | null;
    volume: string;
    weight: string;
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
    handlingTags: HandlingTag[];
    trackingMethod: TrackingMethod;
    status: AssetStatus | string;
    qrCode?: string | null;
}

export interface CatalogAssetFamilyDetails {
    id: string;
    name: string;
    description: string | null;
    category: {
        id: string;
        name: string;
        slug: string;
        color: string;
    } | null;
    images: AssetImage[];
    brand: {
        id: string | null;
        name: string | null;
    } | null;
    company: {
        id: string | null;
        name: string | null;
    } | null;
    stockMode: StockMode;
    packaging: string | null;
    volume: string;
    weight: string;
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
    availableQuantity: number;
    totalQuantity: number;
    stockRecordCount: number;
    statusSummary: AssetFamilySummary;
    conditionSummary: AssetFamilyConditionSummary;
    handlingTags: HandlingTag[];
    stockRecords: CatalogFamilyStockItem[];
}

export interface CatalogCollectionItemDetail {
    id: string;
    assetId: string;
    family?: {
        id: string;
        name: string;
        stockMode: StockMode;
    } | null;
    name: string;
    category: string;
    images: string[];
    defaultQuantity: number;
    availableQuantity: number;
    totalQuantity: number;
    condition: Condition;
    refurbDaysEstimate?: number | null;
    volume: string;
    weight: string;
    dimensionLength: string;
    dimensionWidth: string;
    dimensionHeight: string;
    isAvailable: boolean;
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
    totalVolume: string;
    totalWeight: string;
    isFullyAvailable: boolean;
}

export interface CatalogAssetDetailsResponse {
    success: boolean;
    asset: CatalogAssetDetails;
}

export interface CatalogAssetFamilyDetailsResponse {
    success: boolean;
    family: CatalogAssetFamilyDetails;
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
