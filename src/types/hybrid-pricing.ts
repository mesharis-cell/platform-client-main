/**
 * Hybrid Pricing System Types (Client Portal)
 */

export type TripType = "ONE_WAY" | "ROUND_TRIP";

export interface OrderEstimate {
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
    margin: {
        percent: number;
        total_amount?: number;
        transport_rate_amount?: number;
    };
    estimate_total: number;
    disclaimer?: string;
}

export interface OrderPricing {
    breakdown_lines?: Array<{
        line_id: string;
        // "SYSTEM" covers auto-managed lines (system_key-keyed). BASE_OPS was
        // removed 2026-07 — the bucket survives as the substrate for future
        // auto-spawn fee lines (e.g. percentage surcharges). The API's read
        // path normalizes any legacy "BASE_OPS" snapshot value to "SYSTEM"
        // before it ever reaches the client, so that literal never appears here.
        line_kind?: "SYSTEM" | "RATE_CARD" | "CUSTOM";
        billing_mode?: "BILLABLE" | "NON_BILLABLE" | "COMPLIMENTARY";
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
        system_total?: number;
        rate_card_total?: number;
        custom_total?: number;
        total?: number;
        sell_system_total?: number;
        sell_rate_card_total?: number;
        sell_custom_total?: number;
        sell_total?: number;
        subtotal?: number;
        vat_percent?: number;
        vat_amount?: number;
        sell_total_with_vat?: number;
    };
    subtotal?: number;
    vat?: {
        percent: number;
        amount: number;
    };
    final_total: number;
}

export interface OrderLineItem {
    id: string;
    lineItemType: "CATALOG" | "CUSTOM" | "SYSTEM";
    // BASE_OPS retired 2026-07; kept as a generic string slot for whatever
    // future SYSTEM keys the system-key handler registry introduces (PLAN §11).
    systemKey?: string | null;
    category: string;
    description: string;
    quantity: number | null;
    unit: string | null;
    unitRate: number | null;
    billingMode?: "BILLABLE" | "NON_BILLABLE" | "COMPLIMENTARY";
    total: number;
    notes: string | null;
    clientPriceVisible?: boolean;
    // Per-line policy flags carried on admin-side responses. The client
    // portal never sees these fields because projectByRole(CLIENT) strips
    // them, but the types stay aligned for TS correctness.
    applyMargin?: boolean | null;
    logisticsVisible?: boolean;
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
