"use client";

/**
 * Company Back Office hooks — all direct apiClient calls against /client/v1/company/*.
 * Mirrors use-self-pickups.ts. These power the gated /company section where a
 * company manager (CLIENT + company:* permissions) sees/acts across the whole
 * company. Server enforces scope + permissions; these never send a company_id.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export const companyKeys = {
    dashboard: () => ["company-dashboard"] as const,
    orders: (params?: Record<string, unknown>) => ["company-orders", params] as const,
    order: (id: string | null) => ["company-order", id] as const,
    selfPickups: (params?: Record<string, unknown>) => ["company-self-pickups", params] as const,
    selfPickup: (id: string | null) => ["company-self-pickup", id] as const,
    members: () => ["company-members"] as const,
    estimates: () => ["company-cost-estimates"] as const,
    assets: (params?: Record<string, unknown>) => ["company-assets", params] as const,
    asset: (id: string | null) => ["company-asset", id] as const,
};

const buildQuery = (params: Record<string, unknown>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    return q.toString();
};

// ==================================== DASHBOARD =========================================
export function useCompanyDashboard() {
    return useQuery({
        queryKey: companyKeys.dashboard(),
        queryFn: async () => {
            const { data } = await apiClient.get("/client/v1/company/dashboard");
            return data;
        },
    });
}

// ===================================== ORDERS ===========================================
export function useCompanyOrders(params: Record<string, unknown> = {}) {
    return useQuery({
        queryKey: companyKeys.orders(params),
        queryFn: async () => {
            const { data } = await apiClient.get(`/client/v1/company/order?${buildQuery(params)}`);
            return data;
        },
    });
}

export function useCompanyApproveOrderQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            po_number,
            notes,
        }: {
            id: string;
            po_number?: string;
            notes?: string;
        }) => {
            const { data } = await apiClient.post(`/client/v1/company/order/${id}/approve-quote`, {
                po_number,
                notes,
            });
            return data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["company-orders"] });
            qc.invalidateQueries({ queryKey: companyKeys.order(vars.id) });
            // Broad prefix — the shared detail page keys by the route param
            // (K-number) + scope, not this UUID, so a pinned key never matched.
            qc.invalidateQueries({ queryKey: ["client-order-detail"] });
        },
        onError: throwApiError,
    });
}

export function useCompanyDeclineOrderQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, decline_reason }: { id: string; decline_reason: string }) => {
            const { data } = await apiClient.post(`/client/v1/company/order/${id}/decline-quote`, {
                decline_reason,
            });
            return data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["company-orders"] });
            qc.invalidateQueries({ queryKey: companyKeys.order(vars.id) });
            // Broad prefix — the shared detail page keys by the route param
            // (K-number) + scope, not this UUID, so a pinned key never matched.
            qc.invalidateQueries({ queryKey: ["client-order-detail"] });
        },
        onError: throwApiError,
    });
}

// =================================== SELF-PICKUPS =======================================
export function useCompanySelfPickups(params: Record<string, unknown> = {}) {
    return useQuery({
        queryKey: companyKeys.selfPickups(params),
        queryFn: async () => {
            const { data } = await apiClient.get(
                `/client/v1/company/self-pickup?${buildQuery(params)}`
            );
            return data;
        },
    });
}

export function useCompanyApproveSelfPickupQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            po_number,
            notes,
        }: {
            id: string;
            po_number: string;
            notes?: string;
        }) => {
            const { data } = await apiClient.post(
                `/client/v1/company/self-pickup/${id}/approve-quote`,
                { po_number, notes }
            );
            return data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["company-self-pickups"] });
            qc.invalidateQueries({ queryKey: companyKeys.selfPickup(vars.id) });
            // Broad prefix — the shared detail page keys by the route param
            // + scope, not this UUID, so a pinned key never matched.
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}

export function useCompanyDeclineSelfPickupQuote() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, decline_reason }: { id: string; decline_reason: string }) => {
            const { data } = await apiClient.post(
                `/client/v1/company/self-pickup/${id}/decline-quote`,
                { decline_reason }
            );
            return data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["company-self-pickups"] });
            qc.invalidateQueries({ queryKey: companyKeys.selfPickup(vars.id) });
            // Broad prefix — the shared detail page keys by the route param
            // + scope, not this UUID, so a pinned key never matched.
            qc.invalidateQueries({ queryKey: ["client-self-pickup"] });
        },
        onError: throwApiError,
    });
}

// ===================================== MEMBERS ==========================================
export function useCompanyMembers() {
    return useQuery({
        queryKey: companyKeys.members(),
        queryFn: async () => {
            const { data } = await apiClient.get("/client/v1/company/members");
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

// ================================== COST ESTIMATES ======================================
export function useCompanyCostEstimates() {
    return useQuery({
        queryKey: companyKeys.estimates(),
        queryFn: async () => {
            const { data } = await apiClient.get("/client/v1/company/cost-estimates");
            return data;
        },
    });
}

// Returns the PDF Blob; the calling component performs the DOM download
// (createObjectURL / anchor click) — keeps browser globals out of this hook
// module, mirroring useDownloadCostEstimate in use-client-orders.ts.
export function useDownloadCompanyEstimate() {
    return useMutation({
        mutationFn: async ({
            id,
            entity_type,
        }: {
            id: string;
            entity_type: "ORDER" | "SELF_PICKUP";
        }): Promise<Blob> => {
            const res = await apiClient.get(
                `/client/v1/company/cost-estimate/${id}/pdf?entity_type=${entity_type}`,
                { responseType: "blob" }
            );
            return new Blob([res.data], { type: "application/pdf" });
        },
        onError: throwApiError,
    });
}

// ====================================== ASSETS ==========================================
export function useCompanyAssets(params: Record<string, unknown> = {}) {
    return useQuery({
        queryKey: companyKeys.assets(params),
        queryFn: async () => {
            const { data } = await apiClient.get(`/client/v1/company/asset?${buildQuery(params)}`);
            return data;
        },
    });
}

export function useCompanyAsset(id: string | null) {
    return useQuery({
        queryKey: companyKeys.asset(id),
        queryFn: async () => {
            const { data } = await apiClient.get(`/client/v1/company/asset/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useUpdateCompanyAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: string;
            // Only the five allowlisted presentation fields are ever sent.
            data: {
                name?: string;
                description?: string | null;
                category?: string;
                brand_id?: string | null;
                on_display_image?: string | null;
            };
        }) => {
            const res = await apiClient.patch(`/client/v1/company/asset/${id}`, data);
            return res.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["company-assets"] });
            qc.invalidateQueries({ queryKey: companyKeys.asset(vars.id) });
        },
        onError: throwApiError,
    });
}
