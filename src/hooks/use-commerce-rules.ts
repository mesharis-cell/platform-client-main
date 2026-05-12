"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export type CommerceRuleHit = {
    rule_id: string;
    rule_name: string;
    severity: "WARN" | "BLOCK" | "SUGGEST";
    message: string;
    related_asset_id?: string;
    related_family_id?: string;
};

export type EvaluatePayload = {
    cart: Array<{
        asset_id: string;
        family_id?: string | null;
        quantity: number;
    }>;
};

// Item 6 of the 9-item bundle. Client calls /commerce-rules/evaluate
// before final submit; if WARN hits are returned, checkout shows them in
// a confirm dialog and lets the client acknowledge before proceeding.
export function useEvaluateCommerceRules() {
    return useMutation({
        mutationFn: async (payload: EvaluatePayload): Promise<{ hits: CommerceRuleHit[] }> => {
            try {
                const response = await apiClient.post(
                    "/operations/v1/commerce-rules/evaluate",
                    payload
                );
                return response.data?.data || { hits: [] };
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}
