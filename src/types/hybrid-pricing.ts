/**
 * Hybrid Pricing System Types (Client Portal)
 */

export type TripType = "ONE_WAY" | "ROUND_TRIP";

export interface OrderEstimate {
    base_operations: {
        volume: number;
        rate: number;
        total: number;
    };
    transport?: {
        city: string;
        trip_type: TripType;
        vehicle_type: string;
        rate: number;
    };
    suggested_transport?: {
        city: string;
        vehicle_type: string;
        estimated_rate: number;
        note?: string;
    };
    logistics_subtotal: number;
    margin: {
        percent: number;
        total_amount?: number;
        base_ops_amount?: number;
        transport_rate_amount?: number;
    };
    estimate_total: number;
    disclaimer?: string;
}

export interface OrderPricing {
    breakdown_lines?: Array<{
        line_id: string;
        line_kind?: "BASE_OPS" | "RATE_CARD" | "CUSTOM";
        category?: string;
        label: string;
        quantity: number;
        unit: string;
        unit_price?: number;
        total?: number;
        sell_unit_price?: number;
        sell_total?: number;
        client_price_visible?: boolean;
    }>;
    totals?: {
        base_ops_total?: number;
        rate_card_total?: number;
        custom_total?: number;
        total?: number;
        sell_base_ops_total?: number;
        sell_rate_card_total?: number;
        sell_custom_total?: number;
        sell_total?: number;
    };
    logistics_sub_total: number;
    service_fee: number;
    final_total: number;
}

export interface OrderLineItem {
    id: string;
    lineItemType: "CATALOG" | "CUSTOM";
    category: string;
    description: string;
    quantity: number | null;
    unit: string | null;
    unitRate: number | null;
    total: number;
    notes: string | null;
    clientPriceVisible?: boolean;
    isVoided: boolean;
}

export type ReskinStatus = "pending" | "complete" | "cancelled";

export interface ReskinRequest {
    id: string;
    originalAssetName: string;
    targetBrandId: string | null;
    targetBrandCustom: string | null;
    clientNotes: string;
    newAssetName: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    status: ReskinStatus;
}
