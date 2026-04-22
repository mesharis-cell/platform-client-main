"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

/**
 * Auto-firing availability preview — mirrors `useFeasibility` in shape.
 * Calls the unified `POST /asset/availability` endpoint with the cart items
 * + an optional delivery/pickup window. Returns the structured per-asset
 * result so the UI can show unavailable items alongside feasibility issues
 * while the user is still picking dates (i.e. before the "review" step
 * where `validateAvailability` does its final check).
 *
 * IMPORTANT: callers MUST memoize `items` and `window` via `useMemo` with
 * fine-grained deps — otherwise new references on every render cause
 * queryKey churn and a refetch loop. The queryKey serialises `items` via
 * JSON.stringify to stay stable by value.
 *
 * A null window disables the query (nothing meaningful to compute without
 * dates). An empty cart also disables it.
 */
export type AvailabilityReasonCode =
    | "NOT_FOUND"
    | "SOFT_DELETED"
    | "TRANSFORMED"
    | "MAINTENANCE"
    | "INSUFFICIENT_QUANTITY";

export interface AvailabilityPreviewItem {
    asset_id: string;
    asset_name: string;
    tracking_method: "INDIVIDUAL" | "BATCH";
    total_quantity: number;
    booked_quantity: number;
    self_booked_quantity: number;
    available_quantity: number;
    requested_quantity?: number;
    is_available: boolean;
    reason_code?: AvailabilityReasonCode;
    next_available_date?: string;
}

export interface AvailabilityPreviewResult {
    items: AvailabilityPreviewItem[];
}

export function useAvailabilityPreview({
    items,
    window,
    enabled = true,
}: {
    items: Array<{ asset_id: string; quantity: number }>;
    window: { start: string; end: string } | null;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: [
            "availability-preview",
            JSON.stringify(items),
            window?.start ?? null,
            window?.end ?? null,
        ],
        queryFn: async (): Promise<AvailabilityPreviewResult> => {
            const body: {
                items: typeof items;
                window?: { start: string; end: string };
            } = { items };
            if (window) body.window = window;

            const response = await apiClient.post("/operations/v1/asset/availability", body);
            return response.data.data as AvailabilityPreviewResult;
        },
        enabled: enabled && items.length > 0 && window !== null,
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

/**
 * Digest a preview result into the shape the helper component renders:
 * a list of blocking items with human-friendly reason summaries.
 */
export function interpretAvailabilityPreview(result: AvailabilityPreviewResult | undefined): {
    hasIssues: boolean;
    blockingItems: AvailabilityPreviewItem[];
} {
    if (!result) return { hasIssues: false, blockingItems: [] };
    const blockingItems = result.items.filter((i) => !i.is_available);
    return { hasIssues: blockingItems.length > 0, blockingItems };
}
