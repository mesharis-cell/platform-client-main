/**
 * Hybrid Pricing System Types (Client Portal)
 */

export type TripType = "ONE_WAY" | "ROUND_TRIP";
export type VehicleType = "STANDARD" | "7_TON" | "10_TON";

export interface TransportRateLookup {
    emirate: string;
    tripType: TripType;
    vehicleType: VehicleType;
    rate: number;
}

export interface OrderEstimate {
    base_operations: {
        volume: number;
        rate: number;
        total: number;
    };
    transport: {
        emirate: string;
        trip_type: TripType;
        vehicle_type: VehicleType;
        rate: number;
    };
    logistics_subtotal: number;
    margin: {
        percent: number;
        total_amount: number;
        base_ops_amount: number;
        transport_rate_amount: number;
    };
    estimate_total: number;
}

export interface OrderPricing {
    base_operations: {
        volume: number;
        rate: number;
        total: number;
    };
    transport: {
        emirate: string;
        trip_type: TripType;
        vehicle_type: VehicleType;
        system_rate: number;
        final_rate: number;
        vehicle_changed: boolean;
        vehicle_change_reason: string | null;
    };
    line_items: {
        catalog_total: number;
        custom_total: number;
    };
    logistics_subtotal: number;
    margin: {
        percent: number;
        amount: number;
        is_override: boolean;
        override_reason: string | null;
    };
    final_total: number;
    calculated_at: string;
    calculated_by: string;
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
